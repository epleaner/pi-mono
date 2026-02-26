import assert from "node:assert";
import { describe, it } from "node:test";
import { type Component, TUI } from "../src/tui.js";
import { VirtualTerminal } from "./virtual-terminal.js";

class StaticComponent implements Component {
	constructor(private readonly lines: string[]) {}

	render(_width: number): string[] {
		return this.lines;
	}

	invalidate(): void {}
}

class InputComponent implements Component {
	public readonly inputs: string[] = [];

	render(_width: number): string[] {
		return ["input"];
	}

	handleInput(data: string): void {
		this.inputs.push(data);
	}

	invalidate(): void {}
}

describe("TUI dock layout", () => {
	it("renders a left dock and main content in two columns", async () => {
		const terminal = new VirtualTerminal(40, 8);
		const tui = new TUI(terminal);

		tui.addChild(new StaticComponent(["main-line"]));
		tui.showDock(new StaticComponent(["dock-line"]), { width: 12 });

		tui.start();
		const viewport = await terminal.flushAndGetViewport();
		const firstLine = viewport[0] ?? "";

		assert.ok(firstLine.includes("dock-line"), `expected dock content in first line: ${firstLine}`);
		assert.ok(firstLine.includes("│"), `expected separator in first line: ${firstLine}`);
		assert.ok(firstLine.includes("main-line"), `expected main content in first line: ${firstLine}`);

		tui.stop();
	});

	it("toggles focus between main and dock", async () => {
		const terminal = new VirtualTerminal(40, 8);
		const tui = new TUI(terminal);

		const main = new InputComponent();
		const dock = new InputComponent();
		tui.addChild(main);
		tui.showDock(dock, { width: 14 });

		tui.setFocus(main);
		tui.start();
		await terminal.flush();

		terminal.sendInput("a");
		await terminal.flush();
		assert.deepStrictEqual(main.inputs, ["a"]);
		assert.deepStrictEqual(dock.inputs, []);

		tui.toggleDockFocus();
		terminal.sendInput("b");
		await terminal.flush();
		assert.deepStrictEqual(main.inputs, ["a"]);
		assert.deepStrictEqual(dock.inputs, ["b"]);

		tui.toggleDockFocus();
		terminal.sendInput("c");
		await terminal.flush();
		assert.deepStrictEqual(main.inputs, ["a", "c"]);
		assert.deepStrictEqual(dock.inputs, ["b"]);

		tui.stop();
	});

	it("removes dock when hideDock is called", async () => {
		const terminal = new VirtualTerminal(40, 8);
		const tui = new TUI(terminal);

		tui.addChild(new StaticComponent(["main-line"]));
		tui.showDock(new StaticComponent(["dock-line"]), { width: 12 });
		tui.start();
		await terminal.flush();

		tui.hideDock();
		const viewport = await terminal.flushAndGetViewport();
		const firstLine = viewport[0] ?? "";

		assert.ok(!firstLine.includes("dock-line"), `did not expect dock content after hideDock: ${firstLine}`);
		assert.ok(firstLine.includes("main-line"), `expected main content after hideDock: ${firstLine}`);

		tui.stop();
	});
});
