import { Color, Component, Graphics, Mask, Node, NodePool, ScrollView, Size, UITransform, Vec2, _decorator, ccenum, director, sp, v2 } from "cc";
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
    GetCellIdentifier(dataIndex: number): string;

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
     * @en Direction of the grid scrolling
     * @zh 列表滚动的方向
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
     * @zh 滚动到指定的单元格 (vertical)该单元格在最上边，(horizontal)该单元格在最左边
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

    // Enable ContentGraphics for debugging
    private m_debug: boolean = false;
    // After add component Scrollview , Mask, content Node, the onLoad function will be called.
    private m_inited: boolean = false;

    /**
     * @en A map that stores the size of each cell, organized by row and column.
     * @zh 记录每个cell的size
     */
    private m_gridCellSize: { [row: number]: { [col: number]: Size } } = {};

    /**
     * @en Sets the size of a cell in the grid.
     * @zh 设置网格中某个单元格的大小。
     *
     * @param row The row index of the cell.
     * @param col The column index of the cell.
     * @param size The size of the cell.
     */
    private _setGridCellSize = (row: number, col: number, size: Size) => {
        if (!this.m_gridCellSize[row]) this.m_gridCellSize[row] = {};
        this.m_gridCellSize[row][col] = size;
    }

    /**
     * @en A map that records the offset for each row (vertical) or each column (horizontal).
     * @zh 记录 (vertical)每一行的offset，(horizontal)每一列的offset
     */
    private m_gridCellOffset: { [rowCol: number]: Vec2 } = {};

    /**
     * @en Sets the offset for a specific row or column in the grid.
     * @zh 设置网格中某一行或某一列的偏移量。
     * @param rowCol The index of the row or column.
     * @param offset The offset value for the row or column.
     */
    private _setGridCellOffset = (rowCol: number, offset: Vec2) => {
        this.m_gridCellOffset[rowCol] = offset;
    }

    /**
     * @en A map that records the coordinates (row and column) of each cell in the scroll container for the corresponding dataIndex.
     * @zh 记录每个数据的dataIndex对应的cell在整个滚动容器中的坐标，即(row，col)
     */
    private m_gridCellCoordinates: { [dataIndex: number]: { row: number, col: number } } = {};
    /**
     * @en A map that records the dataIndex of the first cell in each row (vertical).
     * @en A map that records the dataIndex of the first cell in each row (vertical) or each column (horizontal).
     * @zh 记录每一行(vertiacl) 第一个col的dataIndex, (horizontal)第一个rol的dataIndex。
     */
    private m_gridCellCoordinatesPrefix: { [rowCol: number]: number } = {};

    /**
     * @en Sets the coordinates (row and column) for a specific dataIndex in the grid. Also records the dataIndex of the first cell in each row or column depending on the scrolling direction.
     * @zh 设置网格中某个 dataIndex 的坐标（行和列）。根据滚动方向，也记录每行或每列第一个 cell 的 dataIndex。
     * @param dataIndex The index of the data.
     * @param row The row index of the cell.
     * @param col The column index of the cell.
     */
    private _setGridCellCoordinates = (dataIndex: number, row: number, col: number) => {
        this.m_gridCellCoordinates[dataIndex] = { row: row, col: col };

        if (this.direction === EDirection.VERTICAL && this.m_gridCellCoordinatesPrefix[row] == undefined) {
            this.m_gridCellCoordinatesPrefix[row] = dataIndex;
        }
        else if (this.direction === EDirection.HORIZONTAL && this.m_gridCellCoordinatesPrefix[col] == undefined) {
            this.m_gridCellCoordinatesPrefix[col] = dataIndex;
        }
    }

    /**
     * @en The range of cells currently within the visible scroll area, represented as (rowTop, rowBottom) or (colLeft, colRight).
     * @zh 当前滚动区域内的cell的范围， 即(rowTop, rowBottom) 或者 (colLeft, colRight)
     */
    private m_curOffsetRange: number[] = [];

    /**
     * @en The cells currently within the visible scroll area.
     * @zh 当前滚动区域内的cell
     */
    private m_activeCellViews: InfiniteCell[] = [];

    /**
     * @en Each cell, when destroyed, is placed into this pool for reuse.
     * @zh 每个cell销毁时，会被放入这个池中，以便重复利用
     */
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

        this.m_gridCellSize = {};
        this.m_gridCellOffset = {};
        this.m_gridCellCoordinates = {};
        this.m_gridCellCoordinatesPrefix = {};

        if (this.direction === EDirection.VERTICAL) {
            this._loadVertical();
        }
        else if (this.direction === EDirection.HORIZONTAL) {
            this._loadHorizontal();
        }

        this._refreshActiveCell();
    }

    private _loadVertical() {
        const uiTransContent = this._content.getComponent(UITransform);
        const contentSize = uiTransContent.contentSize;
        const dataLen = this._delegate.GetCellNumber();

        let totalWidth = contentSize.width;
        let totalHeight = this.paddingTop;

        let curRowWidth = 0;
        let curRowSizeArr = [];
        let row = -1;
        let col = -1;

        const nextRow_ = () => {
            row ++;
            col = 0;
            curRowWidth = 0;
            curRowSizeArr = [];
        }

        const nextCol_ = () => {
            col ++;
        }

        /**
         * @en When the last cell in each row is added, the height of the tallest cell is used as the height of the row, and the overall height of the scrolling container is updated.
         * @zh 每一个row添加完最后一个cell的时候, 找高度最高的cell作为这一行的高度，并且更新整体滚动容器的高度
         * @param isLastCell
         */
        const updateTotalHeight_ = (isLastCell: boolean) => {
            this._setGridCellOffset(row, v2(0, totalHeight));
            curRowSizeArr.sort((a, b) => { return b.height - a.height });
            totalHeight += curRowSizeArr[0].height + (isLastCell ? 0 : this.spacingY) + (isLastCell ? this.paddingBottom : 0);
        }

        nextRow_();

        for (let dataIndex = 0; dataIndex < dataLen; dataIndex ++) {
            let isLastCell = dataIndex === dataLen - 1;
            let cellSize = this._delegate.GetCellSize(dataIndex);

            /**
             * @en If this cell, when added, exceeds the width of the scroll area, it will be added to the current row if it's the first cell in the current row. Otherwise, it will be added to the next row.
             * @zh 如果这个cell添加后超过滚动区域的宽度，如果这个cell是当前行的第一个cell，这个cell会被添加到当前行，否则这个cell会被添加到下一行。
             */
            let isOutOfRow = (curRowWidth + cellSize.width) > totalWidth;
            if (!isOutOfRow) {
                curRowWidth += cellSize.width + (!col ? 0 : this.spacingX);
                curRowSizeArr.push(cellSize);

                this._setGridCellSize(row, col, cellSize);
                this._setGridCellCoordinates(dataIndex, row, col);

                nextCol_();
                continue;
            }

            if (col) {
                updateTotalHeight_(isLastCell);
                nextRow_();
                dataIndex --;
                continue;
            }

            /**
             * @en Set this cell as the first cell in this row. If the width of this cell still exceeds the width of the scroll area, this cell becomes the only cell in this row.
             * @zh 这个将cell成为这一行的第一个cell，如果这个cell的宽度仍旧超过滚动区域的宽度，这个cell就变成这一行的唯一cell
             */
            isOutOfRow = (curRowWidth + cellSize.width) > totalWidth;

            curRowWidth += cellSize.width + (!col ? 0 : this.spacingX);
            curRowSizeArr.push(cellSize);

            this._setGridCellSize(row, col, cellSize);
            this._setGridCellCoordinates(dataIndex, row, col);

            if (isOutOfRow) {
                updateTotalHeight_(isLastCell);
                nextRow_();
            }
            else {
                nextCol_();
            }
        }

        uiTransContent.setContentSize(totalWidth, totalHeight);
    }

    private _loadHorizontal() {
        const uiTransContent = this._content.getComponent(UITransform);
        const contentSize = uiTransContent.contentSize;
        const dataLen = this._delegate.GetCellNumber();

        let totalWidth = this.paddingLeft;
        let totalHeight = contentSize.height;

        let curColheight = 0;
        let curColSizeArr = [];
        let row = -1;
        let col = -1;

        const nextRow_ = () => {
            row ++;
        }

        const nextCol_ = () => {
            col ++;
            row = 0;
            curColheight = 0;
            curColSizeArr = [];
        }

        /**
         * @en When each column finishes adding the last cell, find the cell with the highest width as the width of this column, and update the width of the overall scroll container.
         * @zh 每一个col添加完最后一个cell的时候, 找宽度最高的cell作为这一行的宽度，并且更新整体滚动容器的宽度
         * @param isLastCell
         */
        const updateTotalWidth_ = (isLastCell: boolean) => {
            this._setGridCellOffset(col, v2(totalWidth, 0));
            curColSizeArr.sort((a, b) => { return b.width - a.width });
            totalWidth += curColSizeArr[0].width + (isLastCell ? 0 : this.spacingX) + (isLastCell ? this.paddingRight : 0);
        }

        nextCol_();

        for (let dataIndex = 0; dataIndex < dataLen; dataIndex ++) {
            let isLastCell = dataIndex === dataLen - 1;
            let cellSize = this._delegate.GetCellSize(dataIndex);

            /**
             * @en If this cell exceeds the height of the scroll area after being added, it will be added to the current column if it's the first cell of the current column; otherwise, it will be added to the next column.
             * @zh 如果这个cell添加后超过滚动区域的高度，如果这个cell是当前列的第一个cell，这个cell会被添加到当前列，否则这个cell会被添加到下一列。
             */
            let isOutOfCol = (curColheight + cellSize.height) > totalHeight;
            if (!isOutOfCol) {
                curColheight += cellSize.height + (!col ? 0 : this.spacingY);
                curColSizeArr.push(cellSize);

                this._setGridCellSize(row, col, cellSize);
                this._setGridCellCoordinates(dataIndex, row, col);

                nextRow_();
                continue;
            }

            if (col) {
                updateTotalWidth_(isLastCell);
                nextCol_();
                dataIndex --;
                continue;
            }


            /**
             * @en Set this cell as the first cell in this column. If the height of this cell still exceeds the height of the scroll area, this cell becomes the only cell in this column.
             * @zh 这个将cell成为这一列的第一个cell，如果这个cell的高度仍旧超过滚动区域的高度度，这个cell就变成这一列的唯一cell
             */
            isOutOfCol = (curColheight + cellSize.height) > totalHeight;

            curColheight += cellSize.height + (!col ? 0 : this.spacingY);
            curColSizeArr.push(cellSize);

            this._setGridCellSize(row, col, cellSize);
            this._setGridCellCoordinates(dataIndex, row, col);

            if (isOutOfCol) {
                updateTotalWidth_(isLastCell);
                nextCol_();
            }
            else {
                nextRow_();
            }
        }

        uiTransContent.setContentSize(totalWidth, totalHeight);
    }

    private _refreshActiveCell(force?: boolean) {
        const range = this._getScrollOffsetRange();
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

        if (isRangeEqual) return;

        this.m_activeCellViews = this.m_activeCellViews.filter((cell) => cell !== undefined);

        let min = this.m_curOffsetRange[0];
        let max = this.m_curOffsetRange[1];

        for (let i = min; i <= max; i ++) {
            let j = -1;
            while(true) {
                j ++;

                let row = this.direction === EDirection.VERTICAL ? i : j;
                let col = this.direction === EDirection.VERTICAL ? j : i;

                console.log('>>> row', row, 'col', col);

                if (!this.m_gridCellSize[row] || !this.m_gridCellSize[row][col]) break;

                let dataIndex = this._getDataIndexByCoordinate(row, col);
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
        const id = this._delegate.GetCellIdentifier(dataIndex);
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
        if (!this._isRangeValid([row, col])) {
            return v2(0, 0);
        }

        const size = this.m_gridCellSize[row][col];
        if (this.direction === EDirection.VERTICAL) {
            let posX = 0;
            for (let i = 0; i <= col; i ++) {
                posX += this.m_gridCellSize[row][i].width;
            }
            posX = posX + col * this.spacingX - size.width / 2;
            return { x: posX, y: - this.m_gridCellOffset[row].y - size.height / 2 };
        }

        if (this.direction === EDirection.HORIZONTAL) {
            let posY = 0;
            for (let i = 0; i <= row; i ++) {
                posY -= this.m_gridCellSize[i][col].height;
            }
            posY = posY - row * this.spacingY + size.height / 2;
            return { x: this.m_gridCellOffset[col].x + size.width / 2, y: posY }
        }
    }

    private _getScrollOffsetRange(offset?: Vec2): number[] {
        const curOffset = offset || this._scrollView.getScrollOffset();
        const viewSize = this._scrollView.view.contentSize;

        if (this._isScrollOutOfBound(curOffset)) {
            return [-1, -1];
        }

        if (this.direction === EDirection.VERTICAL) {
            const offsetTop = curOffset.y < 0 ? 0 : curOffset.y;
            const offsetBottom = curOffset.y + viewSize.height;
            const rows: string[] = Object.keys(this.m_gridCellOffset);

            let rowTop = -1;
            let rowBottom = -1;

            let low = 0;
            let high = Number(rows[rows.length - 1]);

            while(low <= high) {
                let mid = Math.floor((low + high) / 2);
                let offset = this.m_gridCellOffset[mid];
                if ((offset.y - this.paddingTop) <= offsetTop) {
                    rowTop = mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }

            if (rowTop >= 0) {
                high = Number(rows[rows.length - 1]);
                for (let row = rowTop + 1; row <= high; row ++) {
                    let offset = this.m_gridCellOffset[row];
                    if (offset.y > offsetBottom) {
                        break;
                    }
                    rowBottom = row;
                }
                rowBottom = rowBottom == -1 ? rowTop : rowBottom;
            }

            return [rowTop, rowBottom];
        }

        if (this.direction === EDirection.HORIZONTAL) {
            const offsetRight = curOffset.x - viewSize.width;
            const offsetLeft = curOffset.x > 0 ? 0 : curOffset.x;
            const cols: string[] = Object.keys(this.m_gridCellOffset);

            let colLeft = -1;
            let colRight = -1;

            let low = 0;
            let high = Number(cols[cols.length - 1]);

            while(low <= high) {
                let mid = Math.floor((low + high) / 2);
                let offset = this.m_gridCellOffset[mid];
                if (-(offset.x - this.paddingLeft) >= offsetLeft) {
                    colLeft = mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }

            if (colLeft >= 0) {
                high = Number(cols[cols.length - 1]);
                for (let col = colLeft + 1; col <= high; col ++) {
                    let offset = this.m_gridCellOffset[col];
                    if (-offset.x < offsetRight) {
                        break;
                    }
                    colRight = col;
                }
                colRight = colRight == -1 ? colLeft : colRight;
            }

            return [colLeft, colRight]
        }
    }

    private _getRow(dataIndex: number): number {
        let ret = this.m_gridCellCoordinates[dataIndex];
        return ret == undefined ? -1 : ret.row;
    }

    private _getCol(dataIndex: number): number {
        let ret = this.m_gridCellCoordinates[dataIndex];
        return ret == undefined ? -1 : ret.col;
    }

    private _getDataIndexByCoordinate(row: number, col: number): number | undefined {
        if (this.direction === EDirection.VERTICAL) {
            let prefix = this.m_gridCellCoordinatesPrefix[row];
            return prefix + col;
        }
        if (this.direction === EDirection.HORIZONTAL) {
            let prefix = this.m_gridCellCoordinatesPrefix[col];
            return prefix + row;
        }
    }

    private _isScrollOutOfBound(offset: Vec2): boolean {
        const curOffset = offset || this._scrollView.getScrollOffset();
        const viewSize = this._scrollView.view.contentSize;
        const contentSize = this._scrollView.content.getComponent(UITransform).contentSize;
        if (this.direction === EDirection.VERTICAL && (curOffset.y < -viewSize.height || curOffset.y > contentSize.height)) {
            return true;
        }

        if (this.direction === EDirection.HORIZONTAL && (curOffset.x > viewSize.width || curOffset.x < -contentSize.width)) {
            return true;
        }
        return false;
    }

    private _isRangeValid(range: number[]): boolean {
        return range[0] >= 0 && range[1] >= 0;
    }

    private _isRangeEqual(range1: number[], range2: number[]): boolean {
        return range1[0] === range2[0] && range1[1] === range2[1];
    }
}
