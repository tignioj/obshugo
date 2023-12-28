import {
	TFile,
	Notice,
	App,
	Editor,
	MarkdownView,
	Modal,
	Plugin,
	PluginSettingTab,
	Setting,
	SuggestModal,
	TFolder, TAbstractFile,
} from 'obsidian';
import {AskModal} from "./AskModal";
import {EditorView} from "@codemirror/view";
import {EditorSelection} from "@codemirror/state";
import moment from "moment";

// 常量配置
// 文档目录
const POSTS_PATH = "content/posts"

// Remember to rename these classes and interfaces!
interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	/**
	 * 更新选中文档的最新修改日期、标题和分类，其中分类是通过切割所在路径后、排除根目录和最底层文件夹名称得到的。
	 * 排除最底层文件夹是因为所有的文档都以 index.md 存储，
	 * 真正的名称存储在父目录中，因此父目录作为文档的标题，不能作为一种分类。
	 * @param activeFile 选中的文件
	 * @returns
	 */
	async updateMeta(activeFile: TFile) {
		if (!activeFile) {
			new Notice("请选中文件以更新属性");
			return;
		}
		await this.app.fileManager.processFrontMatter(activeFile,
			(frontMatter) => {
				// 修改最近更新时间
				// frontMatter["lastmod"] = new Date(activeFile?.stat.mtime).toISOString();
				frontMatter["lastmod"] = moment(activeFile?.stat.mtime).toISOString(true); // 时区

				// 分类
				frontMatter["categories"] = activeFile.path.split("/").slice(2, -2)

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
	/**
	 * 更新单个属性
	 * @param file
	 * @param key
	 * @param value
	 */
	async updateMetaOne(file: TFile, key: string, value: any) {
		await this.app.fileManager.processFrontMatter(file,
			(frontMatter) => {
				frontMatter[key] = value;
			})
	}

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
				console.log(frontMatter);
				frontMatter["date"] = moment(activeFile?.stat.ctime).toISOString(true); // 创建日期
				frontMatter["lastmod"] = moment(activeFile?.stat.mtime).toISOString(true); // 修改最近更新时间
				frontMatter["categories"] = activeFile.path.split("/").slice(2, -2); // 分类
				frontMatter["title"] = activeFile.parent?.name // 标题
				frontMatter["draft"] = "true"
				frontMatter["tags"] = [];
				frontMatter["series"] = [];
				// 系列
				//let series = this.app.vault.getAbstractFileByPath("content/series").children
			});
	}

	/**
	 *
	 * @returns 获取系列，即content/series/下一级的所有目录名称。
	 */
	getSeries(): Series[] {

		const folderOrFile = this.app.vault?.getAbstractFileByPath("content/series")
		// 把TAbstractFile强制转换为TFolder对象,这样才能调用children。
		const series = (<TFolder>folderOrFile)?.children

		const arr = new Array<Series>();
		series.forEach((item: any) => {
			arr.push({title: item.name, description: item.name})
		});
		console.log(arr)
		return arr;
	}

	async onload() {
		// this.registerMarkdownPostProcessor(
		// 	(element, context) => {
		// 	const links = element.findAll(".internal-link")
		// 		for(const link of links) {
		// 			const s=link.getAttribute("data-href")
		// 			if (s) {
		// 				console.log("attr",s)
		// 				const ns = s.replace(/.*\/(.*)\/index.zh-cn.md/g, "$1")
		// 				link.setText(ns)
		// 			}
		// 		}
		// });
		//
		await this.loadSettings();
		this.addCommand({
			id: "example-editor-command",
			name: "Example editor command",
			editorCallback: (editor, view) => {
				// @ts-expect-error, not typed
				const editorView = view.editor.cm as EditorView;
				editorView.dispatch({selection: {anchor: 0}})
				editorView.dispatch({
					selection: EditorSelection.create([
						EditorSelection.range(4, 5),
						EditorSelection.range(6, 7),
						EditorSelection.cursor(8)
					], 1)
				})

			},
		});

		// 文件：新建帖子
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				// 判断该目录是否可以创建帖子（content/posts直接子目录以及所有的分类目录下都可以创建帖子。
				if(!this.isPostsFolder(file)) return;

				menu.addItem((item) => {
					item
						.setTitle("hugo:新建帖子")
						.setIcon("document")
						.onClick(async () => {
							new Notice(file.path);
							const ask = new AskModal(this.app, async (titleName) => {
								// new Notice(`Hello, ${result}`)
								if (file instanceof TFile) {
									console.log("It's a file!");
								} else if (file instanceof TFolder) {
									console.log("It's a folder!");
									// 当前目录下创建文件夹
									file.vault.createFolder(file.path + "/" + titleName);
									// 创建index.zh-cn.md
									const path = file.path + "/" + titleName + "/" + "index.zh-cn.md";
									await file.vault.create(path, "").then((f) => {
										new Notice("文档创建成功！")
										this.insertTemplate(f);
									});
								}
								// this.app.vault.createFolder(result)
							})
							ask.setTitle("输入帖子名称")
							ask.setOldValue("untitled")
							ask.open();
						});
				});
			})
		);
		// 文件：新建分类
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!this.isPostsFolder(file)) return;// 如果不是分类文件夹，不可修改
				menu.addItem((item)=> {
					item.setTitle("hugo:添加分类").setIcon("document").onClick(async () => {
						const ask = new AskModal(this.app, async (newCategoryName) => {
							this.app.vault.createFolder(file.path + "/" + newCategoryName);
						});
						ask.setTitle("输入添加的分类名称");
						ask.setOldValue("")
						ask.open();
					})
				})
			})
		)

		// 文件：修改分类  此操作会更新目录下的所有categories标签信息
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!this.isCategoryFolder(file)) return;// 如果不是分类文件夹，不可修改

				menu.addItem((item) => {
					item
						.setTitle("hugo:修改分类名称")
						.setIcon("document")
						.onClick(async () => {
							new Notice(file.path);
							const ask = new AskModal(this.app, async (newCategoryName) => {
								if (file instanceof TFolder) {
									// 修改目录名称
									// this.app.vault.rename(file, (file.parent?.path +"/" + newCategoryName))
									this.app.fileManager.renameFile(file, (file.parent?.path + "/" + newCategoryName))
										.then(() => {
											console.log(file.path)
											const mfs = file.vault.getMarkdownFiles();
											// 匹配路径下的所有Markdown都要修改分类信息
											mfs.forEach((mf) => {
												if (mf.path.contains(file.path)) {
													// 根据路径计算分类
													const cs = mf.path.split("/").slice(2, -2)
													this.updateMetaOne(mf, "categories", cs);
												}
											})
										})
								}
								// this.app.vault.createFolder(result)
							})
							ask.setTitle("修改分类");
							ask.setOldValue(file.name);
							ask.open();
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
								this.updateMeta(view.file)
								// 改名字
							} else new Notice("未选中文档");
						});
				});
			})
		);

		// 编辑器-右键菜单，修改帖子标题
		this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor, view) => {
				menu.addItem((item) => {
					item
						.setTitle("hugo:修改标题")
						.setIcon("info")
						.onClick(async () => {
							const file = view.file;
							if (file instanceof TFile) {
								// 修改帖子标题，实际上是修改目录
								const ask = new AskModal(this.app, async (newPostName) => {
									// 修改目录名称
									const newPath = file.parent?.parent?.path + "/" + newPostName;
									console.log(file.parent?.path, newPath);
									this.app.fileManager.renameFile(<TFolder>file.parent, newPath)
										.then(() => {
											// 修改帖子
											console.log(file)
											this.updateMetaOne(file, "title", newPostName);
										})
									// this.app.vault.createFolder(result)
								})
								ask.setTitle("修改帖子名称")
								if (file.parent) ask.setOldValue(file.parent?.name)
								ask.open();
							} else new Notice("这不是帖子，无效操作");
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


		// this.addCommand({
		// 	id: "hugo:update file properties",
		// 	name: "hugo:更新属性",
		// 	callback: async() => {
		// 		//const folderOrFile = this.app.vault.getAbstractFileByPath("demo1/hello.md")
		// 		const activeFile = this.app.workspace.getActiveFile();
		// 		if(activeFile) this.updateMeta(activeFile)
		// 		else new Notice("未找到文件");
		// 	}
		// });

		// This creates an icon in the left ribbon.
		// this.addRibbonIcon('dice', '修改文档属性-系列', (evt: MouseEvent) => {
		// 	// Called when the user clicks the icon.
		// 	new SeriesleModal(this.app, this.getSeries()).open();
		// 		//async (result) => new Notice(`Hello, ${result.title}!`)).open();
		// });
		this.addRibbonIcon("info",
			"修改链接名称",
			async () => {
			}
		);

		this.registerEvent(this.app.vault.on("rename", async (file, oldPath) => {
			// console.log(file);
		}))
		this.registerEvent(this.app.vault.on("modify", (file) => {
			console.log(file);
		}))

		this.registerEvent(this.app.workspace.on("codemirror", (cm) => {
			console.log("cm!!!");
		}))

		// let orig_fn = this.app.workspace.editorSuggest.suggests[0].selectSuggestion;
		// this.app.workspace.editorSuggest.suggests[0].selectSuggestion =
		// 	function (value, evt) {
		// 		value.file.basename = value.file.parent.name;
		// 		console.log(value);
		// 		orig_fn.apply(this, [value, evt]);
		// 	}

		// Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
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
	isCategoryFolder( file: TAbstractFile): boolean {
		if (file == null) return false;
		if (file instanceof TFile) return false;
		if (file instanceof TFolder) {
			// 不是指定目录下的文件夹，不是分类文件夹
			if (!file.path.startsWith(POSTS_PATH)) return false;
			// posts本身不是分类文件夹
			if (file.path == POSTS_PATH) return false;
			// 一级目录下包含.md文件的文件夹，不是分类文件夹，而是文档标题
			const items = file.children;
			for(let i= 0 ;i < items.length; i++) {
				const item = items[i];
				// 判断包含了md文件，返回false
				if((item instanceof TFile) && item.extension == "md") return false;
			}
		}
		return true;
	}

	/**
	 * 判读是否可以新建帖子
	 * content/posts目录下可以新建帖子
	 * 所有categories目录下都可以新建帖子。
	 * @param file
	 */
	isPostsFolder(file: TAbstractFile): boolean {
		if (file instanceof TFolder && file.path == POSTS_PATH)  return true;
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
		await this.updateProp("series", [series.title]);
	}

	/**
	 * 更改文档属性
	 * @param key 属性名称
	 * @param value 属性值
	 * @returns
	 */
	async updateProp(key: string, value: any) {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("请选中文件以更新属性");
			return;
		}
		await this.app.fileManager.processFrontMatter(activeFile,
			(frontMatter) => {
				console.log(frontMatter);
				// 系列
				// let series = this.app.vault.getAbstractFileByPath("content/series").children
				frontMatter[key] = value;
			});
	}
}


class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!!!!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}


class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}


