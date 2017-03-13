import {Range, Position, TextEditor, TextEditorEdit, workspace, SnippetString} from "vscode";
import Function from "./block/function";
import Property from "./block/property";
import Class from "./block/class";
import {Doc, Param} from "./doc";

export class Documenter
{
    protected targetPosition:Position;
    protected triggerLine:string;
    protected targetLine:string;
    protected editor:TextEditor;

    constructor(range:Range, editor:TextEditor) {
        this.targetPosition = range.start;
        this.triggerLine = editor.document.lineAt(range.start.line).text;
        this.targetLine = editor.document.lineAt(range.start.line+1).text;
        this.editor = editor;
    }

    getConfig() {
        return workspace.getConfiguration('php-docblocker');
    }

    isValid() {
        return this.triggerLine.search(/^\s*\/\*\*\s+$/) !== -1
            && this.targetLine.search(/^\s*\*/) === -1;
    }

    autoDocument() {
        let func = new Function(this.targetLine);
        if (func.test()) {
            return this.buildSnippet(func.parse());
        }

        let prop = new Property(this.targetLine);
        if (prop.test()) {
            return this.buildSnippet(prop.parse());
        }

        let cla = new Class(this.targetLine);
        if (cla.test()) {
            return this.buildSnippet(cla.parse());
        }

        return this.buildSnippet(new Doc());
    }

    buildSnippet(props:Doc = null) {
        let snippet = new SnippetString();

        if (props == null) {
            props = new Doc();
        }

        let stop = 2;
        let gap = !this.getConfig().get('gap');

        snippet.appendText("/**");
        snippet.appendText("\n * ");
        snippet.appendVariable('1', props.message);

        if (props.params) {
            if (!gap) {
                snippet.appendText("\n * ");
                gap = true;
            }
            props.params.forEach(param => {
                snippet.appendText("\n * @param ");
                snippet.appendVariable(stop++ + '', param.type);
                snippet.appendText(" ");
                snippet.appendVariable(stop++ + '', param.name);
            });
        }

        if (props.var) {
            if (!gap) {
                snippet.appendText("\n * ");
                gap = true;
            }
            snippet.appendText("\n * @var ");
            snippet.appendVariable(stop++ + '', props.var);
        }

        if (props.return) {
            if (!gap) {
                snippet.appendText("\n * ");
                gap = true;
            }
            snippet.appendText("\n * @return ");
            snippet.appendVariable(stop++ + '', props.return);
        }

        let extra = this.getConfig().get('extra');

        if (Array.isArray(extra) && extra.length > 0) {
            if (!gap) {
                snippet.appendText("\n * ");
                gap = true;
            }
            for (var index = 0; index < extra.length; index++) {
                var element = extra[index];
                snippet.appendText("\n * " + element);
            }
        }

        snippet.appendText("\n */");

        return snippet;
    }

    insertSnippet(snippet:SnippetString) {
        this.editor.insertSnippet(snippet);

        let pos = this.triggerLine.search(/(\/\*\*\s*)$/);
        let start = new Position(this.targetPosition.line, pos+3);
        let target = this.targetPosition;
        this.editor.edit(function(edit) {
            edit.delete(new Range(start, target));
        }, {
            undoStopAfter: false,
            undoStopBefore: false
        });
    }
}