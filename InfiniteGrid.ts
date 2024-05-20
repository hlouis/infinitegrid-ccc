import { Color, Component, Graphics, Mask, Node, NodePool, ScrollView, Size, UITransform, Vec2, _decorator, ccenum, v2 } from "cc";
import { InfiniteCell } from "./InfiniteCell";
const { ccclass, property } = _decorator;


/**
 * InfiniteGrid
 * Author: Louis Huang<https://github.com/hlouis>
 * Contributor: Moon G<https://github.com/Moon1890>
 * Date: 2024.05.20
 * Based on Cocos Creator 3.8.2
 */

enum EDirection {
    VERTICAL = 1,
    HORIZONTAL,
}
ccenum(EDirection);

export interface IFDataSource {
    /**
     * 返回这个 List 中数据的总数量
     */
    GetCellNumber(): number;

    /**
     * 通过数据的下标返回这个 CellView 类型标志
     * @param dataIndex: 当前 Cell 所渲染的数据在列表中的下标
     */
    GetCellIdentifer(dataIndex: number): string;

    /**
     * 通过数据的下标返回这个 Cell 的尺寸
     * @param dataIndex: 当前 Cell 所渲染的数据在列表中的下标
     */
    GetCellSize(dataIndex: number): Size;

    /**
     * 获取一个 Cell 的 View 实例，记住这个控件必须已经挂在一个存在的 Node 上
     * @param dataIndex: 当前 Cell 所渲染的数据在列表中的下标
     * @param identifier: 这个 Cell 的表现类型标志
     *
     * 这个回调函数只会出现在已经没有可以重用的 Cell 时，List 才会向这个函数请求新的 Cell 实例
     * 所有已经请求的 Cell 实例都会被存储并重复利用，直到这个list销毁时才释放。
     */
    GetCellView(dataIndex: number, identifier?: string): InfiniteCell;

    /**
     * 根据一个 Cell 的下标获取一个 Cell 的数据，这个数据会作为 Cell 的 UpdateContent 的参数
     * 这个回调是可选的，如果不提供的话，Cell 需要自己在 UpdateContent 中获取更新自己内容的数据
     */
    GetCellData(dataIndex: number): any;
}

@ccclass('InfiniteGrid')
export class InfiniteGrid extends Component {

    /**
     * @en
     *  Direction of the grid scrolling
     * @zh
     *  列表滚动的方向
     */
    @property({
        type: EDirection,
        tooltip: "Scrolling direction of the grid \n 列表滚动的方向"
    })
    public direction = EDirection.VERTICAL;

    /**
     * @en Top padding for the grid
     * @zh 网格的顶部内边距
     */
    @property({
        visible: function (this: InfiniteGrid): boolean {
            return this.direction === EDirection.VERTICAL;
        },
        tooltip: "Top padding for the grid \n 网格的顶部内边距"
    })
    public paddingTop: number = 0;

    /**
     * @en Bottom padding for the grid
     * @zh 网格的底部内边距
     */
    @property({
        visible: function (this: InfiniteGrid): boolean {
            return this.direction === EDirection.VERTICAL;
        },
        tooltip: "Bottom padding for the grid \n 网格的底部内边距"
    })
    public paddingBottom: number = 0;

    /**
     * @en Left padding for the grid
     * @zh 网格的左侧内边距
     */
    @property({
        visible: function (this: InfiniteGrid): boolean {
            return this.direction === EDirection.HORIZONTAL;
        },
        tooltip: "Left padding for the grid \n 网格的左侧内边距"
    })
    public paddingLeft: number = 0;

    /**
     * @en Right padding for the grid
     * @zh 网格的右侧内边距
     */
    @property({
        visible: function (this: InfiniteGrid): boolean {
            return this.direction === EDirection.HORIZONTAL;
        },
        tooltip: "Right padding for the grid \n 网格的右侧内边距"
    })
    public paddingRight: number = 0;

    /**
     * @en Horizontal spacing between cells
     * @zh 单元格之间的水平间距
     */
    @property({
        tooltip: "Horizontal spacing between cells \n 单元格之间的水平间距"
    })
    public spacingX: number = 0;

    /**
     * @en Vertical spacing between cells
     * @zh 单元格之间的垂直间距
     */
    @property({
        tooltip: "Vertical spacing between cells \n 单元格之间的垂直间距"
    })
    public spacingY: number = 0;

    /**
     * @en Number of cells in a row (vertical) or column (horizontal)
     * @zh 每行（垂直）或每列（水平）的单元格数量
     */
    @property({
        tooltip: "Number of cells in a row (vertical) or column (horizontal) \n 每行（垂直）或每列（水平）的单元格数量"
    })
    public cellNum: number = 1;

    /**
     * @en Enable or disable elastic scrolling
     * @zh 启用或禁用弹性滚动
     */
    @property({
        tooltip: "Enable or disable elastic scrolling \n 启用或禁用弹性滚动"
    })
    public elastic: boolean = true;

    /**
     * @en Initialize the grid with the data source
     * @zh 使用数据源初始化网格
     */
    public Init(p: IFDataSource) {
        this._init(p);
    }

    /**
     * @en Reload the entire grid, optionally keeping the scroll position
     * @zh 重新加载整个网格，可选择保留滚动位置
     */
    public Reload(keepPos: boolean = false) {
        this._clear(keepPos);
        this._load();
    }

    /**
     * @en Refresh the currently visible cells
     * @zh 重新刷新当前显示 cell 的内容，不会重新载入整个列表
     */
    public Refresh() {
        this._refreshActiveCell(true);
    }

    /**
     * @en Set event handler for scroll began
     * @zh 设置滚动开始事件处理函数
     */
    private _eventOnScrollBegan: Function | undefined;
    public OnScrollBegan(event: Function) {
        this._eventOnScrollBegan = event;
    }

    /**
     * @en Set event handler for scroll ended
     * @zh 设置滚动结束事件处理函数
     */
    private _eventOnScrollEnded: Function | undefined;
    public OnScrollEnded(event: Function) {
        this._eventOnScrollEnded = event;
    }

    /**
     * @en Set event handler for scrolling
     * @zh 设置滚动事件处理函数
     */
    private _eventOnScrolling: Function | undefined;
    public OnScrolling(event: Function) {
        this._eventOnScrolling = event;
    }

    /**
     * @en Get the maximum scroll offset
     * @zh 获取最大滚动偏移
     */
    public GetMaxScrollOffset(): Vec2 | undefined {
        return this._scrollView && this._scrollView.getMaxScrollOffset();
    }

    /**
     * @en Get the current scroll offset
     * @zh 获取当前滚动偏移
     */
    public GetScrollOffset(): Vec2 | undefined {
        return this._scrollView && this._scrollView.getScrollOffset();
    }

    /**
     * @en Stop the scrolling
     * @zh 停止滚动
     */
    public StopScrolling() {
        this._scrollView && this._scrollView.stopAutoScroll();
    }

    /**
     * @en Scroll to a specific cell
     * @zh 滚动到指定的单元格
     */
    public ScrollToCell(idx: number, timeInSecond: number = 0.01, attenuated: boolean = true) {
        if (!this._scrollView) return;
        const maxOffset = this._scrollView.getMaxScrollOffset();
        if (this.direction === EDirection.VERTICAL) {
            let row = this._getRow(idx);
            let offset = this.m_gridCellOffset[row];
            if (!offset) return;
            this._scrollView.scrollToOffset(v2(0, offset.y > maxOffset.y ? maxOffset.y : offset.y), timeInSecond, attenuated);
        }
        else if (this.direction === EDirection.HORIZONTAL) {
            let col = this._getCol(idx);
            let offset = this.m_gridCellOffset[col];
            if (!offset) return;
            this._scrollView.scrollToOffset(v2(offset.x > maxOffset.x ? maxOffset.x : offset.x, 0), timeInSecond, attenuated);
        }
    }

    ////////////////////////////////////////////////////////////
    // implementation
    ////////////////////////////////////////////////////////////

    private _scrollView: ScrollView | undefined;
    private _content: Node | undefined;
    private _delegate: IFDataSource | undefined;

    private m_debug: boolean = false;
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
        this.node.on(ScrollView.EventType.SCROLL_BEGAN, this._onScrollBegan, this);
        this.node.on(ScrollView.EventType.SCROLL_ENDED, this._onScrollEnded, this);
    }

    private _removeEventListeners() {
        this.node.off(ScrollView.EventType.SCROLLING, this._onScrolling, this);
        this.node.off(ScrollView.EventType.SCROLL_BEGAN, this._onScrollBegan, this);
        this.node.off(ScrollView.EventType.SCROLL_ENDED, this._onScrollEnded, this);
    }

    private _onScrolling() {
        if (!this._delegate) return;
        this._refreshActiveCell();
        this._eventOnScrolling && this._eventOnScrolling();
    }

    private _onScrollBegan() {
        if (!this._delegate) return;
        this._eventOnScrollBegan && this._eventOnScrollBegan();
    }

    private _onScrollEnded() {
        if (!this._delegate) return;
        this._eventOnScrollEnded && this._eventOnScrollEnded();
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

    private _clear(keepPos: boolean = false) {
        (this.m_activeCellViews || []).forEach((cell) => {
            this._removeCellView(cell.dataIndex, cell);
        })
        this.m_activeCellViews = [];
        this.m_curOffsetRange = [];

        if (!keepPos) {
            this.direction === EDirection.VERTICAL ? this._scrollView.scrollToTop() : this._scrollView.scrollToLeft();
        }
    }

    private _load() {
        const dataLen = this._delegate && this._delegate.GetCellNumber();
        if (!dataLen) return;

        this.m_gridCellSize = [];
        this.m_gridCellOffset = [];

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

    private _refreshActiveCell(force?: boolean) {
        const range = this._getScrowOffsetRange();
        if (!this._isRangeValid(range)) return;

        const isRangeEqual = this._isRangeEqual(range, this.m_curOffsetRange);
        if (!force && isRangeEqual) return;

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
        if (isRangeEqual) return;

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
