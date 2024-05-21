# InfiniteGrid Component

This project provides an InfiniteGrid component for Cocos Creator >= 3.8.0, designed to efficiently handle large data sets with smooth scrolling and cell reuse. It is highly configurable and supports both vertical and horizontal scrolling.


## Features

1. Dynamic Loading: Dynamically loads and unloads cells based on user scrolling position.

2. Multiple Cell Types: Supports various cell types, each with different sizes and views.

3. Flexible Data Source: Provides a flexible data source through implementing the IFDataSource interface.

4. Horizontal and Vertical Scrolling: Supports both horizontal and vertical scrolling.

## Installation

1. Clone the repository.

2. Copy the InfiniteGrid.ts and InfiniteCell.ts files to your Cocos Creator project's assets folder.

3. Ensure you have Cocos Creator >= 3.8.0 installed.

## Usage

### Setting Up the InfiniteGrid

1. Prepare Cell Templates. Ensure the anchor point of the cell node is set to the center v2(0.5, 0.5).

2. Create a new Node in your Cocos Creator scene.

3. Add the InfiniteGrid component to the Node.

4. Configure the properties of the InfiniteGrid in the Inspector panel:

    - Direction: Set the scrolling direction (vertical or horizontal).

    - Padding: Set the padding values for the grid.

    - Spacing: Set the spacing between cells.

    - Cell Number: Set the number of cells in a row (vertical) or column (horizontal).

    - Elastic: Enable or disable elastic scrolling.

### Implementing the Data Source.

Implement the IFDataSource interface to provide the data source. The IFDataSource interface defines the following methods:

```ts
interface IFDataSource {
    GetCellNumber(): number {
        // Return the total number of cells
    }

    GetCellIdentifer(dataIndex: number): string {
        // Return the identifier for the cell type based on the data index
    }

    GetCellSize(dataIndex: number): Size {
        // Return the size of the cell based on the data index
    }

    GetCellView(dataIndex: number, identifier?: string): InfiniteCell {
        // Return an instance of the cell view based on the data index and identifier
    }

    GetCellData(dataIndex: number): any {
        // Return the data for the cell based on the data index
    }
}
```

### Initializing the InfiniteGrid

Initialize the InfiniteGrid with your data source:

```ts
import { InfiniteGrid } from "./InfiniteGrid";

const infiniteGridNode = ...; // Get your InfiniteGrid node
const infiniteGrid = infiniteGridNode.getComponent(InfiniteGrid);

infiniteGrid.Init(...); // dataSource implements IFDataSource

```

### Controlling the InfiniteGrid

You can control the InfiniteGrid using various methods:


1. Reload: Reload the entire grid, optionally keeping the scroll position.

```ts
infiniteGrid.Reload(true);
```

2. Refresh: Refreshes the currently visible cells without reloading the entire list. Note that if the length of your list data changes, you should use Reload instead.

```ts
infiniteGrid.Refresh();

```

3. Scroll to a specific cell: Scroll to a specific cell index.

```ts
infiniteGrid.ScrollToCell(10);
```

4. Gets the maximum scroll offset.

```ts
infiniteGrid.GetMaxScrollOffset();
```

5. Gets the current scroll offset.

```ts
infiniteGrid.GetScrollOffset();
```

6. Stops the current scrolling action.

```ts
infiniteGrid.StopScrolling();
```

### Event Handling

Set event handlers for scroll events:

```ts
infiniteGrid.OnScrollBegan(() => {
    console.log("Scroll began");
});

infiniteGrid.OnScrollEnded(() => {
    console.log("Scroll ended");
});

infiniteGrid.OnScrolling(() => {
    console.log("Scrolling");
});

```

### Contributing

Contributions to `InfiniteGrid` are welcome. If you have any suggestions or improvements, please submit a Pull Request or an Issue.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
