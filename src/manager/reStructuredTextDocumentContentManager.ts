import { TextEditor, Uri, ViewColumn } from "vscode";
import { DocumentContentManagerInterface } from "./documentContentManagerInterface";
import { HtmlPreview } from "../util/htmlPreview";
import { Docutils } from "../util/docutils"

let rst2mdown = require("rst2mdown");
// import {rst2mdown} from "rst2mdown";

let Markdown2HtmlLess = require("markdown2html-less").Markdown2HtmlLess;
const markdown2htmlLess = new Markdown2HtmlLess();


export class ReStructuredTextDocumentContentManager implements DocumentContentManagerInterface {

    private _editor: TextEditor;

    public constructor(editor: TextEditor) {
        this._editor = editor;
        return this;
    }


    // @Override
    public editor(): TextEditor {
        return this._editor;
    }

    // 生成当前编辑页面的可预览代码片段
    // @Override
    public async createContentSnippet(): Promise<string> {
        let editor = this._editor;

        if (!editor) {
            return HtmlPreview.errorSnippet(this.getWindowErrorMessage());
        }
        return this.generatePreviewSnippet(editor);
    }

    // @Override
    public sendPreviewCommand(previewUri: Uri, displayColumn: ViewColumn): Thenable<void> {
        return HtmlPreview.sendPreviewCommand(previewUri, displayColumn);

    }

    // private getErrorMessage(): string {
    //     return `Active editor doesn't show a ReStructured Text document (.rst|.rest|.hrst)- no properties to preview.`;
    // }

    private getWindowErrorMessage(): string {
        return `No Active editor - no properties to preview.`;
    }

    private rstSrcSnippetWithNodeModules(rstContent: string): string {
        const html = markdown2htmlLess.markdown2html(rst2mdown(rstContent));

        html.head = html.head || '';
        html.body = html.body || '';
        return `${html.head}
${html.body}`;
    }
    private rstSrcSnippetWithDocutils(editor: TextEditor): Promise<string> {
        if (!editor || !editor.document) {
            return Promise.resolve(HtmlPreview.errorSnippet(this.getWindowErrorMessage()));
        }
        // 获取当前编辑页面对应的文档
        let doc = editor.document;
        return Docutils.rst2html(doc.fileName);
    }
    private rstSrcSnippet(editor: TextEditor): Promise<string> {
        if (!editor) {
            return Promise.resolve(HtmlPreview.errorSnippet(this.getWindowErrorMessage()));
        }

        let thiz = this;
        return this.rstSrcSnippetWithDocutils(editor).catch(function (error) {
            console.info("try rst2html of docutils failed, please check python and docutils environment: " + error);
            console.info(", we use a simple preview instead ^-)");
            // window.showInformationMessage("try rst2html of docutils failed, please check python and docutils environment, we use a simple preview instead ^-)");
            if (!editor.document) {
                return Promise.resolve(HtmlPreview.errorSnippet(thiz.getWindowErrorMessage()));
            }
            return thiz.rstSrcSnippetWithNodeModules(editor.document.getText());
        });

    }

    // 生成预览编辑页面
    private generatePreviewSnippet(editor: TextEditor): Promise<string> {
        if (!editor || !editor.document) {
            return Promise.resolve(HtmlPreview.errorSnippet(this.getWindowErrorMessage()));
        }
        // 获取当前编辑页面对应的文档
        let doc = editor.document;
        return this.rstSrcSnippet(editor).then(function (rstSrc: string) {
            return HtmlPreview.fixNoneNetLinks(rstSrc, doc.fileName);
        });
    }

}
