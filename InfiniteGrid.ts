import { Color, Component, ConfigurableConstraint, Graphics, HeightField, Mask, Node, NodePool, ScrollView, Size, UITransform, Vec2, _decorator, ccenum, v2 } from "cc";
import { InfiniteCell } from "./InfiniteCell";
const { ccclass, property } = _decorator;

enum EDirection {
    VERTICAL = 1,
    HORIZONTAL,
}
ccenum(EDirection);

export interface IFDataSource {

    GetCellNumber(): number;

    GetCellIdentifer(dataIndex: number): string;

    GetCellSize(dataIndex: number): Size;

    GetCellView(dataIndex: number, identifier?: string): InfiniteCell;

    GetCellData(dataIndex: number): any;
}


@ccclass('InfiniteGrid')
export class InfiniteGrid extends Component {

    /**
     * @en
     *
     * @zh
     *
     */
    @property({
        type: EDirection,
        tooltip: ""
    })
    public direction = EDirection.VERTICAL;

    /**
     * @en
     *
     * @zh
     *
     */
    @property({
        visible: function (this: InfiniteGrid): boolean {
            return this.direction === EDirection.VERTICAL;
        },
        tooltip: ""
    })
    public paddingTop: number = 0;

    /**
     * @en
     *
     * @zh
     *
     */
    @property({
        visible: function (this: InfiniteGrid): boolean {
            return this.direction === EDirection.VERTICAL;
        },
        tooltip: ""
    })
    public paddingBottom: number = 0;

    /**
     * @en
     *
     * @zh
     *
     */
    @property({
        visible: function (this: InfiniteGrid): boolean {
            return this.direction === EDirection.HORIZONTAL;
        },
        tooltip: ""
    })
    public paddingLeft: number = 0;

    /**
     * @en
     *
     * @zh
     *
     */
    @property({
        visible: function (this: InfiniteGrid): boolean {
            return this.direction === EDirection.HORIZONTAL;
        },
        tooltip: ""
    })
    public paddingRight: number = 0;

    /**
     * @en
     *
     * @zh
     *
     */
    @property({
        tooltip: ""
    })
    public spacingX: number = 0;

    /**
     * @en
     *
     * @zh
     *
     */
    @property({
        tooltip: ""
    })
    public spacingY: number = 0;

    /**
     * @en
     *
     * @zh
     *
     */
    @property({
        tooltip: ""
    })
    public cellNum: number = 1;

    /**
     * @en
     *
     * @zh
     *
     */
    @property({
        tooltip: ""
    })
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

    private m_debug: boolean = true;
    private m_inited: boolean = false;

    private m_gridCellSize: { [row: number]: { [col: number]: Size } } = {};
    private m_gridCellOffset: { [row: number]: Vec2 } = {};
    private m_curOffsetRange: number[] = [];
    private m_activeCellViews: InfiniteCell[] = [];

    private m_cellPools: { [name: string]: NodePool } = {};

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

        this.m_inited = true;
        if (this._delegate) {
            this._load();
        }
    }

    public onEnable() {
        this._addEventListeners();
    }

    public onDestroy() {
        this._removeEventListeners();
    }

    public update() {
        if (this.m_debug) {
            this._enableContentGraphics();
        }
    }

    private _addEventListeners() {
        this.node.on(ScrollView.EventType.SCROLLING, this._onScrolling, this);
    }

    private _removeEventListeners() {
        this.node.off(ScrollView.EventType.SCROLLING, this._onScrolling, this);
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
        if (this.m_inited) {
            this._load();
        }
    }

    private _load() {
        const dataLen = this._delegate && this._delegate.GetCellNumber();
        if (!dataLen) return;

        let totalWidth = 0;
        let totalHeight = 0;
        let curSizeArr = [];

        for (let i = 0; i < dataLen; i++) {
            if (!i) {
                this.direction === EDirection.VERTICAL && (totalHeight += this.paddingTop);
                this.direction === EDirection.HORIZONTAL && (totalWidth += this.paddingLeft);
            }
            else if (i == dataLen - 1) {
                this.direction === EDirection.VERTICAL && (totalHeight += this.paddingBottom);
                this.direction === EDirection.HORIZONTAL && (totalWidth += this.paddingRight);
            }

            let row = this._getRow(i);
            let col = this._getCol(i);

            let size = this._delegate.GetCellSize(i);
            curSizeArr.push(size);

            if (this.direction === EDirection.VERTICAL && !col) {
                this.m_gridCellOffset[row] = v2(0, totalHeight);
                curSizeArr.sort((a, b) => b.height - a.height);
                totalHeight += curSizeArr[0].height + this.spacingY;
                curSizeArr = [];
            }

            if (this.direction === EDirection.HORIZONTAL && !row) {
                this.m_gridCellOffset[col] = v2(totalWidth, 0);
                curSizeArr.sort((a, b) => b.width - a.width);
                totalWidth += curSizeArr[0].width + this.spacingX;
                curSizeArr = [];
            }

            if (this.direction === EDirection.VERTICAL) {
                if (!this.m_gridCellSize[row]) {
                    this.m_gridCellSize[row] = {};
                }
                this.m_gridCellSize[row][col] = size;
            }
            else if (this.direction === EDirection.HORIZONTAL) {
                if (!this.m_gridCellSize[col]) {
                    this.m_gridCellSize[col] = {};
                }
                this.m_gridCellSize[col][row] = size;
            }
        }

        const uiTrans = this._content.getComponent(UITransform);
        uiTrans.setContentSize(
            this.direction === EDirection.VERTICAL ? uiTrans.width : totalWidth,
            this.direction === EDirection.VERTICAL ? totalHeight : uiTrans.height
        );

        this._refreshActiveCell();
    }

    private _removeCellView(dataIndex: number, cell?: InfiniteCell) {
        cell = cell || this._getActiveCellView(dataIndex);
        if (!cell) return;
        cell.dataIndex = -1;

        const cellPool = this._getCellPool(cell.cellIdentifier);
        cellPool.put(cell.node);
        cell.node.removeFromParent();
    }

    private _addCellView(dataIndex: number) {
        const id = this._delegate.GetCellIdentifer(dataIndex);
        const cellPool = this._getCellPool(id);
        const node = cellPool && cellPool.get();
        const cell = node && node.getComponent('InfiniteCell') as InfiniteCell || this._delegate.GetCellView(dataIndex);
        if (!cell) return;

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
        const range = this._getScrowOffsetRange();
        if (!this._isRangeValid(range) || this._isRangeEqual(range, this.m_curOffsetRange)) return;

        this.m_curOffsetRange = range;

        this.m_activeCellViews.forEach((cell, index) => {
            let dataIndex = cell.dataIndex;
            if (dataIndex < 0) return;

            let rc = this.direction === EDirection.VERTICAL ? this._getRow(dataIndex) : this._getCol(dataIndex);
            let isInRange = rc >= this.m_curOffsetRange[0] && rc <= this.m_curOffsetRange[1];

            if (isInRange) {
                this._updateCellView(dataIndex, cell);
            }
            else {
                this._removeCellView(dataIndex, cell);
                this.m_activeCellViews[index] = undefined;
            }
        });

        this.m_activeCellViews = this.m_activeCellViews.filter((cell) => cell !== undefined);

        for (let i = this.m_curOffsetRange[0]; i <= this.m_curOffsetRange[1]; i ++) {
            for (let j = 0; j < this.cellNum; j ++) {
                let dataIndex = this.direction === EDirection.VERTICAL ? this._getDataIndexByRowCol(i, j) : this._getDataIndexByRowCol(j, i);
                if (dataIndex === undefined) break;

                let cell = this._getActiveCellView(dataIndex);
                if (!cell) {
                    this._addCellView(dataIndex);
                }
            }
        }
    }

    private _getActiveCellView(dataIndex: number): InfiniteCell | undefined {
        return this.m_activeCellViews.find((cell) => cell.dataIndex === dataIndex);
    }

    private _getCellPool(cellIdentifier: string): NodePool {
        let cellPool = this.m_cellPools[cellIdentifier];
        if (!cellPool) {
            cellPool = new NodePool();
            this.m_cellPools[cellIdentifier] = cellPool;
        }
        return cellPool;
    }

    private _getCellPosition(dataIndex: number): {x: number, y: number} {
        const row = this._getRow(dataIndex), col = this._getCol(dataIndex);
        if (this.direction === EDirection.VERTICAL) {
            const size = this.m_gridCellSize[row][col];
            let posX = 0;
            for (let i = 0; i <= col; i ++) {
                posX += this.m_gridCellSize[row][i].width;
            }
            posX = posX + col * this.spacingX - size.width / 2;
            return { x: posX, y: - this.m_gridCellOffset[row].y - size.height / 2 };
        }
        else if (this.direction === EDirection.HORIZONTAL) {
            const size = this.m_gridCellSize[col][row];
            let posY = 0;
            for (let i = 0; i <= row; i ++) {
                posY -= this.m_gridCellSize[col][i].height;
            }
            posY = posY - row * this.spacingY + size.height / 2;
            return { x: this.m_gridCellOffset[col].x + size.width / 2, y: posY}
        }
    }

    private _getScrowOffsetRange(offset?: Vec2): number[] {
        const curOffset = offset || this._scrollView.getScrollOffset();
        const viewSize = this._scrollView.view.contentSize;
        const contentSize = this._scrollView.content.getComponent(UITransform).contentSize;

        if (this.direction === EDirection.VERTICAL) {
            const offsetBottom = curOffset.y + viewSize.height;
            let rowTop = -1;
            let rowBottom = -1;

            for (let k in this.m_gridCellOffset) {
                let row = Number(k);
                let offset = this.m_gridCellOffset[row];
                if (offset.y > offsetBottom) break;

                let nextOffsetY = this.m_gridCellOffset[row + 1] ? this.m_gridCellOffset[row + 1].y : contentSize.height;
                if (rowTop == -1 && nextOffsetY >= curOffset.y) {
                    rowTop = row;
                }

                if (rowTop > -1) {
                    rowBottom = row;
                }
            }

            return [rowTop, rowBottom];
        }
        else if (this.direction === EDirection.HORIZONTAL) {
            let isOutLeft = curOffset.x > 0;
            curOffset.x = Math.abs(curOffset.x);
            let offsetRight = isOutLeft ? (viewSize.width - curOffset.x) : (curOffset.x + viewSize.width);
            curOffset.x = isOutLeft ? 0 : curOffset.x;

            let colLeft = -1;
            let colRight = -1;

            for (let k in this.m_gridCellOffset) {
                let col = Number(k);
                let offset = this.m_gridCellOffset[col];
                if (offset.x > offsetRight) break;

                let nextOffsetX = this.m_gridCellOffset[col + 1] ? this.m_gridCellOffset[col + 1].x : contentSize.width;
                if (colLeft == -1 && nextOffsetX >= curOffset.x) {
                    colLeft = col;
                }

                if (colLeft > -1) {
                    colRight = col;
                }
            }

            return [colLeft, colRight]
        }
    }

    private _getRow(dataIndex: number): number {
        return this.direction === EDirection.VERTICAL ? Math.floor(dataIndex / this.cellNum) : dataIndex % this.cellNum;
    }

    private _getCol(dataIndex: number): number {
        return this.direction === EDirection.VERTICAL ? dataIndex % this.cellNum : Math.floor(dataIndex / this.cellNum);
    }

    private _getDataIndexByRowCol(row: number, col: number): number | undefined {
        const dataIndex = this.direction === EDirection.VERTICAL ? row * this.cellNum + col : col * this.cellNum + row;
        return dataIndex < this._delegate.GetCellNumber() ? dataIndex : undefined;
    }

    private _isRangeValid(range: number[]): boolean {
        return range[0] >= 0 && range[1] >= 0;
    }

    private _isRangeEqual(range1: number[], range2: number[]): boolean {
        return range1[0] === range2[0] && range1[1] === range2[1];
    }
}
