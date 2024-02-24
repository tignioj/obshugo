import {
	TFile,
	Notice,
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	SuggestModal,
	TFolder, TAbstractFile,
	moment
} from 'obsidian';
import {AskModal} from "./AskModal";


// 常量配置
// 文档目录
interface ObsHugoSettings {
	momentDateFormat: string;
	toggleAutoUpdateLastMod: boolean;
	toggleAutoCategories: true; // TODO：自动分类开关
	postPath: string;
	timeout: string;
	templatePath: string;
}

const DEFAULT_SETTINGS: ObsHugoSettings = {
	momentDateFormat: "YYYY-MM-DDTHH:mm:ssZ", /*https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/*/
	toggleAutoUpdateLastMod: true,
	toggleAutoCategories: true, // 自动分类
	postPath: "content/posts",
	timeout: '5', // 停止输入后多少秒更新lastmod属性
	templatePath: ''
}

/**
 * 更新选中文档的最新修改日期、标题和分类，其中分类是通过切割所在路径后、排除根目录和最底层文件夹名称得到的。
 * 排除最底层文件夹是因为所有的文档都以 index.md 存储，
 * 真正的名称存储在父目录中，因此父目录作为文档的标题，不能作为一种分类。
 * @param settings 插件配置
 * @param activeFile 选中的文件
 * @returns
 */
async function updateMeta(settings: ObsHugoSettings, activeFile: TAbstractFile) {
	if (!(activeFile instanceof TFile)) return;
	await this.app.fileManager.processFrontMatter(activeFile,
		(frontMatter: any) => {
			// 修改最近更新时间
			// frontMatter["lastmod"] = new Date(activeFile?.stat.mtime).toISOString();
			frontMatter["lastmod"] = moment(activeFile?.stat.mtime).format(settings.momentDateFormat); // 时区

			// 分类
			frontMatter["categories"] = getCategory(activeFile)

			// 标题
			if (activeFile.parent) {
				frontMatter["title"] = activeFile.parent?.name
			}
			// 系列
			//let series = this.app.vault.getAbstractFileByPath("content/series").children
		}).then(() => {
		// const newPath = activeFile.parent?.path  + "/" + activeFile.parent?.name + ".md";
		// console.log(newPath);
		// this.app.vault.rename(activeFile, newPath);
	});
}

function getCategory(file: TFile) {
	return file.path.split("/").slice(2, -2)
}

/**
 * 更新单个属性
 * @param file
 * @param key
 * @param value
 */
async function updateMetaOne(file: TAbstractFile, key: string, value: any) {
	// 检查文件是否被删除
	// @ts-ignore
	// 由于deleted是被动态赋值的，但是编译时候是无法检测到deleted属性，
	// 因此应该使用@ts-ignore注解跳过检查
	if (file['deleted']) {
		// console.log("文档已经被删除，无法修改!", file)
		return
	}
	if (!(file instanceof TFile)) return;
	await this.app.fileManager.processFrontMatter(file,
		(frontMatter: any) => {
			frontMatter[key] = value;
		})
}


export default class HugoHelperPlugin extends Plugin {
	settings: ObsHugoSettings;

	/**
	 * 插入模板
	 * @param activeFile
	 */
	async insertTemplate(activeFile: TFile) {
		if (!activeFile) {
			new Notice("请选中文件以更新属性");
			return;
		}

		await this.app.fileManager.processFrontMatter(activeFile,
			(frontMatter) => {
				// console.log(frontMatter);
				const keys = Object.keys(frontMatter)

				// js执行可使用的context
				const context = {
					title: activeFile.parent?.name,
				}
				for (let i = 0; i < keys.length; i++) {
					const key = keys[i];
					const value = frontMatter[key]

					// title已经在创建目录的时候被解析，所以直接用父目录名称即可，无需再次解析否则会出错。
					if (key == "title") {
						frontMatter[key] = activeFile.parent?.name
					} else frontMatter[key] = this.parseValue(value, context);
				}
			})
	}

	/**
	 * 解析属性值，
	 * 	是js:则执行js并返回结果
	 * 	不是js:直接返回value
	 * @param value
	 * @param context js可以调用的上下文
	 */
	parseValue(value: any, context: object) {
		if (typeof (value) === "string" && value.startsWith("{{") && value.endsWith("}}")) {
			const script = value.substring(2, value.length - 2)
			// https://esbuild.github.io/content-types/#direct-eval
			// 避免直接调用eval，用Function代替。其中第一个参数是script中将要访问的变量名称，第二个参数是脚本代码，后面括号的参数是传递给context变量的。
			return String((new Function('context', 'return ' + script))(context))
		} else return value;
	}

	/**
	 * 插入默认模板
	 * @param activeFile
	 */
	async insertDefaultTemplate(activeFile: TFile) {
		if (!activeFile) return;
		await this.app.fileManager.processFrontMatter(activeFile, (frontMatter) => {
			frontMatter["date"] = moment(activeFile?.stat.ctime).format(this.settings.momentDateFormat); // 创建日期
			frontMatter["lastmod"] = moment(activeFile?.stat.mtime).format(this.settings.momentDateFormat); // 修改最近更新时间
			frontMatter["categories"] = activeFile.path.split("/").slice(2, -2); // 分类
			frontMatter["title"] = activeFile.parent?.name // 标题
			frontMatter["draft"] = "true"
			frontMatter["tags"] = [];
			frontMatter["series"] = [];
			// 系列
			//let series = this.app.vault.getAbstractFileByPath("content/series").children
		})
	}

	/**
	 *
	 * @returns 获取系列，即content/series/下一级的所有目录名称。
	 */
	getSeries(): Series[] {
		const folderOrFile = this.app.vault?.getAbstractFileByPath("content/series")
		// 把TAbstractFile强制转换为TFolder对象,这样才能调用children。
		const arr = new Array<Series>();
		if (folderOrFile instanceof TFolder) {
			const series = folderOrFile.children
			series.forEach((item: any) => {
				arr.push({title: item.name, description: item.name})
			});
			// console.log(arr)
		}
		return arr;

	}

	async onload() {
		await this.loadSettings();

		// 文件：新建文章
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				// 判断该目录是否可以创建文章（content/posts直接子目录以及所有的分类目录下都可以创建文章。
				if (!this.isPostsFolder(file)) return;

				menu.addItem((item) => {
					item
						.setTitle("hugo:新建文章")
						.setIcon("file-plus-2")
						.onClick(async () => {
							await this.newPosts(file);
						});
				});
			})
		);

		// 编辑器：更新属性
		this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor, view) => {
				menu.addItem((item) => {
					item
						.setTitle("hugo:更新属性")
						.setIcon("info")
						.onClick(async () => {
							if (view && view.file instanceof TFile) {
								await updateMeta(this.settings, view.file)
								// 改名字
							} else new Notice("未选中文档");
						});
				});
			})
		);

		// // 编辑器-右键菜单：插入模板
		// this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor, view) => {
		// 		menu.addItem((item) => {
		// 			item
		// 				.setTitle("hugo:插入模板")
		// 				.setIcon("info")
		// 				.onClick(async () => {
		// 					if (view && view.file instanceof TFile) this.insertTemplate(view.file)
		// 					else new Notice("未选中文档");
		// 				});
		// 		});
		// 	})
		// );

		// 编辑器-右键菜单：获取系列
		this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor, view) => {
				menu.addItem((item) => {
					item
						.setTitle("hugo:选择系列")
						.setIcon("document")
						.onClick(async () => {
							new SeriesModal(this.app, this.getSeries()).open();
						});
				});
			})
		);

		this.addRibbonIcon("file-plus-2",
			"hugo:新建文章",
			async () => {
				const tf = this.app.vault.getAbstractFileByPath(this.settings.postPath)
				if (tf instanceof TFolder) this.newPosts(tf)
			}
		);

		this.registerEvent(this.app.workspace.on("window-close", async (file, oldPath) => {
		}))

		// 检测到文档移动
		this.registerEvent(this.app.vault.on("rename", file => {
			// 不检测非文档目录
			if (!file.path.startsWith(this.settings.postPath)) return;
			if (file instanceof TFile && file.name.endsWith("md")) {
				updateMeta(this.settings, file);
			}
		}))


		// 检测到文档修改就更新lastmod属性
		let timeoutId: ReturnType<typeof Number>;
		let callBySystem = false; // 系统的修改lastmod标志
		this.registerEvent(this.app.vault.on("modify", (file) => {
			const settings = this.settings;
			if (!this.settings.toggleAutoUpdateLastMod) return; // 是否开启自动更新lastmod
			if (!file.path.startsWith(this.settings.postPath)) return;
			// callBySystem的作用：当检测到文章被用户修改时，会触发修改属性的函数，而“修改属性”本身又是一种修改，为了防止后者被检测到而无休止的修改，
			// 添加callBySystem用于防止函数本身做出的修改行为视作用户的修改检测。
			if (file instanceof TFile && !callBySystem) { // 非系统触发的修改:即用户触发的修改
				// 清除之前的定时器
				window.clearTimeout(timeoutId);
				// 设置新的定时器，在输入停止后的 2000 毫秒执行操作
				// 延迟触发函数
				timeoutId = window.setTimeout(function () {
					// 在这里执行你的操作
					// console.log('用户停止输入了，现在可以执行相关操作');
					callBySystem = true;
					// 执行修改后，callBySystem一定会变成true, 这次的修改事件会被监听到，
					// 但是判断到callBySystem时，会跳过这次修改, 然后将callBySystem修改为false，又继续正常监听用户输入。
					updateMetaOne(file, 'lastmod',
						moment(file?.stat.mtime).format(settings.momentDateFormat)); // 修改最近更新时间)
				}, Number(settings.timeout) * 1000 /*延迟多少毫秒执行*/);

			} else callBySystem = false;

		}))


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new HugoHelperSettingTab(this.app, this));

	}

	/**
	 * 获取模板内容
	 */
	async getTemplateContent() {
		const tp = this.app.vault.getAbstractFileByPath(this.settings.templatePath)
		if (tp instanceof TFile) {
			const template_content = await this.app.vault.read(
				tp as TFile
			);
			// console.log(template_content)
			return template_content;
		}
		return "";
	}

	/**
	 * 获取模板中的属性值
	 * @param key
	 */
	async getTemplateMetaValue(key: string) {
		const file = this.app.vault.getAbstractFileByPath(this.settings.templatePath)
		let value = ""
		if (file instanceof TFile && file.extension == "md") {
			await this.app.fileManager.processFrontMatter(file, (frontMatter) => {
				if (frontMatter[key]) value = frontMatter[key]
			})
		}
		return value
	}

	/**
	 * 指定位置新建文章
	 * @param file 文章将要创建的目录
	 * @private
	 */
	async newPosts(file: TAbstractFile) {
		new Notice(file.path);

		// 读取模板标题
		const templateTitle = await this.getTemplateMetaValue("title")
		// 标题显示在modal输入框
		// 如果是固定字符串，直接显示
		// 如果是js，则显示默认标题
		// 输入确定后，获取到新标题名称
		// 解析标题名称
		const ask = new AskModal(this.app, async (titleName) => {

			// 解析模板标题
			let finalTitle = ""
			const context = {title: titleName} // script可以访问的context
			const titleValue = await this.getTemplateMetaValue("title")
			// 如果是需要解析的标题，则返回解析后的结果
			if (titleValue.startsWith("{{") && titleValue.endsWith("}}")) finalTitle = this.parseValue(titleValue, context)
			// 如果是固定的标题，则返回用户输入后的标题
			else finalTitle = titleName

			if (file instanceof TFolder) {
				// 检测目录是否已经存在，存在则报错
				const exf = this.app.vault.getAbstractFileByPath(file.path + "/" + finalTitle)
				if (exf instanceof TFolder) {
					new Notice("已经存在同名目录，请重新设置文章标题")
					return
				}
				// 当前目录下创建文件夹
				try {
					await file.vault.createFolder(file.path + "/" + finalTitle);
					// 创建index.md
					// TODO: 去掉zh-cn
					const path = file.path + "/" + finalTitle + "/" + "index.zh-cn.md";
					const templateContent = await this.getTemplateContent();
					await file.vault.create(path, templateContent).then((f) => {
						new Notice("文章创建成功！")
						// 插入模板
						if (templateContent.trim().length > 0) this.insertTemplate(f);
						else this.insertDefaultTemplate(f);
					});
				} catch (e) {
					new Notice("新建文章出错:" + e)
				}
			}
			// this.app.vault.createFolder(result)
		})
		ask.setTitle("输入文章标题")
		const defaultTitle = moment(new Date()).format("Y-MM-DD-HHmmss")
		ask.setOldValue((templateTitle.length == 0 || templateTitle.startsWith("{{")) ? defaultTitle : templateTitle)
		ask.open();
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * 判断是否为分类文件夹的规则
	 * 1. 指定目录下 POSTS_PATH 的文件夹就是分类文件夹（默认content/posts,不包括posts本身)
	 * 2. 如果该文件夹下面有.md文件，表明不是分类，而是文档标题
	 * @param file
	 * @return 是否为分类文件夹
	 */
	isCategoryFolder(file: TAbstractFile): boolean {
		if (file == null) return false;
		if (file instanceof TFile) return false;
		if (file instanceof TFolder) {
			// 不是指定目录下的文件夹，不是分类文件夹
			if (!file.path.startsWith(this.settings.postPath)) return false;
			// posts本身不是分类文件夹
			if (file.path == this.settings.postPath) return false;
			// 一级目录下包含.md文件的文件夹，不是分类文件夹，而是文档标题
			const items = file.children;
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				// 判断包含了md文件，返回false
				if ((item instanceof TFile) && item.extension == "md") return false;
			}
		}
		return true;
	}

	/**
	 * 判读是否可以新建文章
	 * content/posts目录下可以新建文章
	 * 所有categories目录下都可以新建文章。
	 * @param file
	 */
	isPostsFolder(file: TAbstractFile): boolean {
		if (file instanceof TFolder && file.path == this.settings.postPath) return true;
		return this.isCategoryFolder(file);
	}
}


interface Series {
	title: string;
	description: string;
}


export class SeriesModal extends SuggestModal<Series> {

	series: Series[];

	constructor(app: App, arr: Series[]) {
		super(app);
		this.series = arr;
	}

	// Returns all available suggestions.
	getSuggestions(query: string): Series[] {
		//   return ALL_BOOKS.filter((book) =>
		// 	book.title.toLowerCase().includes(query.toLowerCase())
		//   );
		return this.series.filter((series) =>
			series.title.toLowerCase().includes(query.toLowerCase()));
	}

	// Renders each suggestion item.
	renderSuggestion(series: Series, el: HTMLElement) {
		el.createEl("div", {text: series.title});
		//el.createEl("small", { text: series });
	}

	// Perform action on the selected suggestion.
	async onChooseSuggestion(series: Series, evt: MouseEvent | KeyboardEvent) {
		new Notice(`Selected ${series.title}`);
		// await this.updateProp("series", [series.title]);

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			return;
		}
		await updateMetaOne(activeFile, "series", [series.title]);
	}
}


class HugoHelperSettingTab extends PluginSettingTab {
	plugin: HugoHelperPlugin;

	constructor(app: App, plugin: HugoHelperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('自动更新lastmod属性')
			.setDesc('停止输入后多少秒自动更新lastmod，不建议设置太低否则会频繁触发合并事件，允许范围2~60')
			.addText(text => text
				.setPlaceholder('4')
				.setValue(this.plugin.settings.timeout)
				.onChange(async (value) => {
					if (Number(value) < 2 || Number(value) > 60) {
						new Notice("无效设置")
						return;
					}
					this.plugin.settings.timeout = value;
					await this.plugin.saveSettings();
				})).addToggle(toggle => {
			toggle.setValue(this.plugin.settings.toggleAutoUpdateLastMod)
				.onChange(async value => {
					this.plugin.settings.toggleAutoUpdateLastMod = value;
					await this.plugin.saveSettings();
				})
		});

		new Setting(containerEl)
			.setName('文档路径')
			.setDesc('存放文档的路径,默认是content/posts, 注意不要开头加上\'/\'')
			.addText(text => text
				.setPlaceholder('content/posts')
				.setValue(this.plugin.settings.postPath)
				.onChange(async (value) => {
					if (this.app.vault.getAbstractFileByPath(value) == null) {
						return;
					}
					this.plugin.settings.postPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('模板日期格式')
			.setDesc('默认模板的date,lastmod属性都会用到这个格式，以及文章的\'更新属性\'功能也会基于此格式更新。采用momentjs, 默认ISO8601，更多格式请查看文档 https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DDTHH:mm:ssZ')
				.setValue(this.plugin.settings.momentDateFormat)
				.onChange(async (value) => {
					this.plugin.settings.momentDateFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('自定义模板路径')
			.setDesc('仅文档属性的值支持解析js: 当用属性值用双花括号包围时，括号内容将被识别为js脚本，例如 {{moment(new Date()).format("YYYYMMDD")}} 将生成指定格式的时间20231230,' +
				'{{context.title}}将解析为文档的标题(md文章的父目录名称即为标题); 若要使用字符串拼接请在花括号内完成; 此选项留白或者文档路径错误时，将使用默认模板; 路径示例：template/HugoTemplate.md')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.templatePath)
				.onChange(async (value) => {
					this.plugin.settings.templatePath = value;
					await this.plugin.saveSettings();
				}));
	}
}


