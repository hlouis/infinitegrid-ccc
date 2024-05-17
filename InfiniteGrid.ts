import { Color, Component, Enum, Graphics, Mask, Node, ScrollView, Size, UITransform, Vec2, _decorator, v2 } from "cc";
import { InfiniteCell } from "./InfiniteCell";
const { ccclass, property } = _decorator;

enum EDirection {
    VERTICAL = 1,
    HORIZONTAL,
}

export interface IFDataSource {

    GetCellNumber(): number;

    GetCellIdentifer(dataIndex: number): string;

    GetCellSize(dataIndex: number): Size;

    GetCellView(dataIndex: number, identifier?: string): InfiniteCell;

    GetCellData(dataIndex: number): any;
}


@ccclass('InfiniteGrid')
export class InfiniteGrid extends Component {

    @property({
        type: Enum(EDirection),
        tooltip: "List 滚动的方向，可以选择垂直或者水平"
    })
    public direction = EDirection.VERTICAL;

    @property({
        tooltip: "cell 之间的像素间隔，最开始和最后面不会添加"
    })
    public spacing = 0;

    @property({
        tooltip: "(Vertical)row数量, (Horizontal)column数量"
    })
    public cellNum = 1;

    @property({ tooltip: "是否允许滚动超过边界 " })
    public elastic: boolean = true;

    public Init(p: IFDataSource) {
        this._init(p);
    }

    /**
     * Reload 整个 List，这时获取数据的回调函数会重新触发一遍，所有的 cell 也会更新一遍内容
     */
    public Reload(keepPos: boolean = false) {
        this._load();
    }

    /**
     * 重新刷新当前显示 cell 的内容，不会重新载入整个列表
     * 所以如果列表的数据数量发生了变化，或是想要修改 Cell 的尺寸，调用 Refresh 是没有用处的，请调用 Reload
     */
    public Refresh() {
    }


    ////////////////////////////////////////////////////////////
    // implementation
    ////////////////////////////////////////////////////////////

    private _scrollView: ScrollView | undefined;
    private _content: Node | undefined;
    private _delegate: IFDataSource | undefined;

    private m_gridCellSize: { [row: number]: { [col: number]: Size } } = {};
    private m_gridCellOffset: { [row: number]: Vec2 } = {};
    private m_curOffsetRange: number[] = [];
    private m_activeCellViews: InfiniteCell[] = [];

    public onLoad() {
        let scrollView = this.node.getComponent(ScrollView);
        if (!scrollView) {
            scrollView = this.node.addComponent(ScrollView);
        }

        if (!this.node.getComponent(Mask)) {
            this.node.addComponent(Mask);
        }

        this._scrollView = scrollView;
        this._scrollView.elastic = this.elastic;
        this._scrollView.horizontal = this.direction === EDirection.HORIZONTAL;
        this._scrollView.vertical = this.direction === EDirection.VERTICAL;

        this._content = new Node('content');
        this._content.parent = this.node;

        let trans = this._content.addComponent(UITransform);
        trans.contentSize = this.node.getComponent(UITransform).contentSize;
        trans.anchorPoint = v2(0, 1);

        this._scrollView.content = this._content;

        if (this._delegate) {
            this._load();
        }
    }

    public onDestroy() {
        this.node.targetOff(this);
    }

    public onEnable() {
        this.node.on("scrolling", this._onScrolling, this);
    }

    private _onScrolling() {
        if (!this._delegate) return;
        this._refreshActiveCell();
    }

    private _enableContentGraphics() {
        if (!this._content) return;
        let trans = this._content.getComponent(UITransform);
        let graphics = this._content.getComponent(Graphics)
        if (!graphics) {
            graphics = this._content.addComponent(Graphics);
        }
        graphics.clear();
        graphics.fillColor = Color.YELLOW;
        graphics.fillRect(0, 0, trans.width, -trans.height);
    }

    private _init(p: IFDataSource) {
        this._delegate = p;
    }

    private _load() {
        const dataLen = this._delegate && this._delegate.GetCellNumber();
        if (!dataLen) return;

        let totalHeight = 0;
        let curRowSizeArr = [];

        for (let i = 0; i < dataLen; i++) {
            let row = this._getRow(i);
            let col = this._getCol(i);

            let size = this._delegate.GetCellSize(i);
            curRowSizeArr.push(size);

            if (!this.m_gridCellSize[row]) {
                this.m_gridCellSize[row] = {};
            }
            this.m_gridCellSize[row][col] = size;

            if (!col) {
                this.m_gridCellOffset[row] = v2(0, totalHeight);
                curRowSizeArr.sort((a, b) => b.height - a.height);
                totalHeight += curRowSizeArr[0].height;
                curRowSizeArr = [];
            }
        }

        const uiTrans = this._content.getComponent(UITransform);
        uiTrans.setContentSize(uiTrans.width, totalHeight);

        const maxOffset = this._scrollView.getMaxScrollOffset();
        for (let row = this._getRow(dataLen - 1); row >= 0; row --) {
            let offset = this.m_gridCellOffset[row];
            if (offset.y <= maxOffset.y) break;
            this.m_gridCellOffset[row] = maxOffset;
        }

        this._refreshActiveCell();
    }

    private _removeCellView(dataIndex: number, cell?: InfiniteCell) {
        cell = cell || this._getActiveCellView(dataIndex);
        if (!cell) return;

        // TODO: recycle cell
        cell.node.removeFromParent();

        this.m_activeCellViews = this.m_activeCellViews.filter((c) => c !== cell);
    }

    private _addCellView(dataIndex: number) {
        const cell = this._delegate.GetCellView(dataIndex);
        if (!cell) return;

        const id = this._delegate.GetCellIdentifer(dataIndex);
        cell.cellIdentifier = id;
        cell.dataIndex = dataIndex;

        const pos = this._getCellPosition(dataIndex);
        cell.node.parent = this._content;
        cell.node.setPosition(pos.x, pos.y);

        this.m_activeCellViews.push(cell);

        this._updateCellView(dataIndex, cell);
    }

    private _updateCellView(dataIndex: number, cell: InfiniteCell) {
        cell.UpdateContent(this._delegate.GetCellData(dataIndex));
    }

    private _refreshActiveCell() {
        const range = this._getScrowOffsetRowRange();
        if (!this._isRangeValid(range) || this._isRangeEqual(range, this.m_curOffsetRange)) return;

        this.m_curOffsetRange = range;

        this.m_activeCellViews.forEach((cell) => {
            let dataIndex = cell.dataIndex;
            if (dataIndex < 0) return;

            let row = this._getRow(dataIndex);
            if (row < this.m_curOffsetRange[0] || row > this.m_curOffsetRange[1]) {
                this._removeCellView(dataIndex, cell);
            }
        })

        for (let row = this.m_curOffsetRange[0]; row <= this.m_curOffsetRange[1]; row ++) {
            for (let col = 0; col < this.cellNum; col ++) {
                let dataIndex = this._getDataIndexByRowCol(row, col);
                if (dataIndex === undefined) break;

                let cell = this._getActiveCellView(dataIndex);
                if (!cell) {
                    this._addCellView(dataIndex);
                } else {
                    this._updateCellView(dataIndex, cell);
                }
            }
        }
    }

    private _getActiveCellView(dataIndex: number): InfiniteCell | undefined {
        return this.m_activeCellViews.find((cell) => cell.dataIndex === dataIndex);
    }

    private _getCellPosition(dataIndex: number): {x: number, y: number} {
        const row = this._getRow(dataIndex), col = this._getCol(dataIndex);
        const size = this.m_gridCellSize[row][col];
        return { x: size.width / 2 + col * size.width, y: - size.height / 2 - row * size.height };
    }

    private _getScrowOffsetRowRange(offset?: Vec2): number[] {
        const curOffset = offset || this._scrollView.getScrollOffset();
        const viewSize = this._scrollView.view.contentSize;
        const offsetBound = this._getScrollOffsetBound();

        let offsetBottom = curOffset.y + viewSize.height;
        offsetBottom = offsetBottom > offsetBound.y ? offsetBound.y : offsetBottom;

        let rowTop = -1;
        let rowBottom = -1;

        for (let k in this.m_gridCellOffset) {
            let row = Number(k);
            let offset = this.m_gridCellOffset[row];
            if (offset.y > offsetBottom) break;

            rowTop = offset.y <= curOffset.y ? row : rowTop;
            rowBottom = rowTop >= 0 ? row : rowBottom;
        }

        return [rowTop, rowBottom];
    }

    private _getRow(dataIndex: number): number {
        return Math.floor(dataIndex / this.cellNum);
    }

    private _getCol(dataIndex: number): number {
        return dataIndex % this.cellNum;
    }

    private _getDataIndexByRowCol(row: number, col: number): number | undefined {
        const dataIndex = row * this.cellNum + col;
        return dataIndex < this._delegate.GetCellNumber() ? dataIndex : undefined;
    }

    private _getScrollOffsetBound(): Vec2 {
        const offsetMax = this._scrollView.getMaxScrollOffset();
        const viewSize = this._scrollView.view.contentSize;
        return v2(0, offsetMax.y + viewSize.height);
    }

    private _isRangeValid(range: number[]): boolean {
        return range[0] >= 0 && range[1] >= 0;
    }

    private _isRangeEqual(range1: number[], range2: number[]): boolean {
        return range1[0] === range2[0] && range1[1] === range2[1];
    }
}
