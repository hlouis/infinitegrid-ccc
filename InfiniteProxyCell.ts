import { _decorator } from "cc";
import { InfiniteCell } from "./InfiniteCell";
const { ccclass } = _decorator;

@ccclass('InfiniteProxyCell')
export class InfiniteProxyCell extends InfiniteCell {

    private data: any;

    /**
     * @en Asynchronously await the actual InfiniteCell and set it as a child of the current node
     * @zh 异步等待实际的 InfiniteCell，并将其设置为当前节点的子节点
     */
    public async awaitCell(it: Promise<InfiniteCell>) {
        const cell = await it;  // Wait for the Promise to return an InfiniteCell
        if (!this.isValid || !this.node.isValid || !cell) return;

        cell.node.setPosition(0, 0);
        cell.node.parent = this.node; // Set the actual cell node as a child of the current node

        if (this.dataIndex >= 0 && this.data) {
            this.UpdateContent(this.data); // Update the content of the actual cell node
        }
    }

    UpdateContent(data: any): void {
        if (!this.isValid || !this.node.isValid) return;
        this.data = data;

        let node = this.node.children[0];
        if (!node) return;

        let cell = node.getComponent('InfiniteCell') as InfiniteCell;
        cell && cell.UpdateContent(data); // Call the UpdateContent method of the InfiniteCell component on the child node to update content
    }
}
