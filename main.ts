import {TFile, Notice ,App, Editor, MarkdownView, Modal, Plugin, PluginSettingTab, Setting, 
	SuggestModal} from 'obsidian';

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
	async updateMeta(activeFile : TFile) {
		if(!activeFile) {
			new Notice("请选中文件以更新属性");
			return;
		}
		await this.app.fileManager.processFrontMatter(activeFile,
		(frontMatter)=>{
			console.log(frontMatter);
			// 修改最近更新时间
			frontMatter["lastmod"]=new Date(activeFile?.stat.mtime).toISOString();
			
			// 分类
			frontMatter["categories"]=activeFile.path.split("/").slice(2,-2)

			// 标题
			frontMatter["title"] = activeFile.parent?.name

			// 系列
			//let series = this.app.vault.getAbstractFileByPath("content/series").children
			
		});
	}
	/**
	 * 
	 * @returns 获取系列，即content/series/下一级的所有目录名称。
	 */
	getSeries() :Series[] {
		const series = this.app.vault?.getAbstractFileByPath("content/series")?.children;

		const arr = new Array<Series>();
		console.log(series)
		series.forEach((item : any) => {
			arr.push({title: item.name, description: item.name})
		});
		console.log(arr)
		return arr;
	}

	async onload() {
		await this.loadSettings();
		// 侧边栏添加一个按钮
		this.addRibbonIcon("info", "更新选中文档的最新修改日期、标题和分类",
			async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if(activeFile)
				this.updateMeta(activeFile)
			}
		);
		this.addCommand({
			id: "update file properties",
			name: "update file properties",
			callback: async() => {
				//const folderOrFile = this.app.vault.getAbstractFileByPath("demo1/hello.md")
				const activeFile = this.app.workspace.getActiveFile();
				this.updateMeta(activeFile)
			}
		});
  
		// This creates an icon in the left ribbon.
		this.addRibbonIcon('dice', '修改文档属性-系列', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new SeriesleModal(this.app, this.getSeries()).open();
				//async (result) => new Notice(`Hello, ${result.title}!`)).open();
		});
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
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

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
}


interface Series {
	title: string;
	description: string;
  }
  

export class SeriesleModal extends SuggestModal<Series> {
	
	series: Series[];
	constructor(app: App, arr: Series[]) {
		super(app);
		this.series=arr;
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
		el.createEl("div", { text:  series.title});
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
	async updateProp(key:string, value:any) {
		const activeFile = this.app.workspace.getActiveFile();
		if(!activeFile) {
			new Notice("请选中文件以更新属性");
			return;
		}
		await this.app.fileManager.processFrontMatter(activeFile,
		(frontMatter)=>{
			console.log(frontMatter);			
			// 系列
			// let series = this.app.vault.getAbstractFileByPath("content/series").children
			frontMatter[key]= value;
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


