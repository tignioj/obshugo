import {App, Modal, Setting} from "obsidian";

export class AskModal extends Modal {
    result: string;
    title: string;
    oldValue: string;
    onSubmit: (result: string) => void;


    constructor(app: App, onSubmit: (result: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    public setTitle(title: string) {
        this.title = title
    }

    public setOldValue(value: string) {
        this.oldValue = value
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.createEl("h1", {text: this.title});

        new Setting(contentEl)
            .setName("标题")
            .addText((text) => {
				text.setValue(this.oldValue)
                this.result=this.oldValue // 当用户没有输入的时候，result为空，所以先赋值
				text.onChange((value) => {
					this.result = value
				})
                }
            );

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Submit")
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onSubmit(this.result);
                    }));
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}
