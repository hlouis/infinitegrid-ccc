# InfiniteGrid Component

This project provides an InfiniteGrid component for Cocos Creator >= 3.8.0, designed to efficiently handle large data sets with smooth scrolling and cell reuse. It is highly configurable and supports both vertical and horizontal scrolling.

```
             Vertiacl:

            ┌─────────────────────────────┬────────                         ┌───┐
            │                             │ padding Top            cell A   │ A │
row 0 ◄─────┤   ┌───┐  ┌───┐  ┌────────┐  ├────────                         └───┘
            │   │ A │  │ A │  │ B      │  │
            │   └───┘  └───┘  │        │  │
            │                 └────────┘  ├────────                         ┌────────┐
            │                             │ spacing Y              cell B   │ B      │
row 1 ◄─────┤   ┌───┐  ┌───────────────┐  ├────────                         │        │
            │   │ A │  │C              │  │                                 └────────┘
            │   └───┘  │               │  │
            │          └───────────────┘  │
            │                             │                                 ┌────────────────┐
row 2 ◄─────┤   ┌───┐  ┌───┐  ┌────────┐  │                        cell C   │ C              │
            │   │ A │  │ A │  │ B      │  │                                 │                │
            │   └───┘  └───┘  │        │  │                                 └────────────────┘
            │                 └────────┘  │
            │                             │
row 3 ◄─────┤   ┌───┐  ┌───────────────┐  │
            │   │ A │  │C              │  │
            │   └───┘  │               │  │
            │          └───────────────┘  ├────────
            │                             │ padding Bottom
            └───────┬──┬──────────────────┴────────
                    │  │
                    │  │
                 spacing X


            Horizontal:

             col 0       col 1               col 2              col 3

               ▲           ▲                   ▲                   ▲
               │           │                   │                   │
               │           │                   │                   │
            ┌──┴───────────┴───────────────────┴───────────────────┴────────────────────┐
            │                                                                           │
            │  ┌───┐       ┌────────────────┐  ┌────────┐          ┌───┐                │
            │  │ A │       │ C              │  │ B      │          │ A │                │
    ────────┤  └───┘       │                │  │        │          └───┘                │
 spacing Y  │              └────────────────┘  └────────┘                               │
    ────────┤  ┌───┐                                               ┌────────┐           │
            │  │ A │       ┌───┐               ┌────────────────┐  │ B      │           │
            │  └───┘       │ A │               │ C              │  │        │           │
            │              └───┘               │                │  └────────┘           │
            │  ┌────────┐                      └────────────────┘                       │
            │  │ B      │  ┌───┐                                   ┌────────────────┐   │
            │  │        │  │ A │               ┌───┐               │ C              │   │
            │  └────────┘  └───┘               │ A │               │                │   │
            │                                  └───┘               └────────────────┘   │
            │                                                                           │
            ├──┬────────┬──┬─────────────────────────────────────────────────────────┬──┤
            │  │        │  │                                                         │  │
            │  │        │  │                                                         │  │
       padding Left  spacing X                                                    padding Right
```

```
Align:
                                                              ┌─────────────────────┐
                                                              │                     │
                                                              │ ┌───┐               │
             ┌───────────────────────────────────────┐        │ │ A │               │
             │                                       │        │ └───┘               │
             │ ┌───┐  ┌────────┐  ┌────────────────┐ │        │                     │
             │ │ A │  │ B      │  │ C              │ │        │ ┌────────┐          │
FLEX_START   │ └───┘  │        │  │                │ │        │ │ B      │          │
             │        │        │  └────────────────┘ │        │ │        │          │
             │        │        │                     │        │ │        │          │
             │        └────────┘                     │        │ │        │          │
             │                                       │        │ └────────┘          │
             └───────────────────────────────────────┘        │                     │
                                                              │ ┌────────────────┐  │
                                                              │ │ C              │  │
                                                              │ │                │  │
                                                              │ └────────────────┘  │
                                                              │                     │
                                                              └─────────────────────┘

                                                              ┌─────────────────────┐
                                                              │                     │
                                                              │        ┌───┐        │
             ┌───────────────────────────────────────┐        │        │ A │        │
             │                                       │        │        └───┘        │
             │        ┌────────┐                     │        │                     │
             │ ┌───┐  │ B      │  ┌────────────────┐ │        │      ┌────────┐     │
             │ │ A │  │        │  │ C              │ │        │      │ B      │     │
 CENTER      │ └───┘  │        │  │                │ │        │      │        │     │
             │        │        │  └────────────────┘ │        │      │        │     │
             │        └────────┘                     │        │      │        │     │
             │                                       │        │      └────────┘     │
             └───────────────────────────────────────┘        │                     │
                                                              │  ┌────────────────┐ │
                                                              │  │ C              │ │
                                                              │  │                │ │
                                                              │  └────────────────┘ │
                                                              │                     │
                                                              └─────────────────────┘

                                                              ┌─────────────────────┐
                                                              │                     │
                                                              │               ┌───┐ │
             ┌───────────────────────────────────────┐        │               │ A │ │
             │                                       │        │               └───┘ │
             │        ┌────────┐                     │        │                     │
FLEX_END     │        │ B      │                     │        │          ┌────────┐ │
             │        │        │  ┌────────────────┐ │        │          │ B      │ │
             │ ┌───┐  │        │  │ C              │ │        │          │        │ │
             │ │ A │  │        │  │                │ │        │          │        │ │
             │ └───┘  └────────┘  └────────────────┘ │        │          │        │ │
             │                                       │        │          └────────┘ │
             └───────────────────────────────────────┘        │                     │
                                                              │  ┌────────────────┐ │
                                                              │  │ C              │ │
                                                              │  │                │ │
                                                              │  └────────────────┘ │
                                                              │                     │
                                                              └─────────────────────┘
```

## Features

1. Dynamic Loading: Dynamically loads and unloads cells based on user scrolling position.

2. Multiple Cell Types: Supports various cell types, each with different sizes and views.

3. Flexible Data Source: Provides a flexible data source through implementing the IFDataSource interface.

4. Flexible Layout: Automatically arranges cells based on their sizes.

    - (Vertical): One cell, when added, exceeds the width of the scroll area, it will be added to the current row if it's the first cell in the current row. Otherwise, it will be added to the next row.

    - (Horizontal): One cell, when added, exceeds the height of the scroll area, it will be added to the current column if it's the first cell in the current column. Otherwise, it will be added to the next column.

5. Dynamic Cell Sizes: Handles cells of varying sizes.


## Installation

1. Clone the repository.

2. Copy the InfiniteGrid.ts and InfiniteCell.ts files to your Cocos Creator project's assets folder.

3. Ensure you have Cocos Creator >= 3.8.0 installed. Not sure work well with versions earlier than 3.8.0.

## Usage

### Setting Up the InfiniteGrid

1. Prepare Cell Templates. Ensure the anchor point of the cell node is set to the center v2(0.5, 0.5).

2. Create a new Node in your Cocos Creator scene.

3. Add the InfiniteGrid component to the Node.

4. Configure the properties of the InfiniteGrid in the Inspector panel:

    - Direction: Set the scrolling direction (vertical or horizontal).

    - Align: Depending on your requirements, set the alignment for the cells. This could be FLEX_START, CENTER or FLEX_End, etc. Refer to [CSS Flexbox (align-items)](https://medium.com/@MakeComputerScienceGreatAgain/understanding-flexbox-a-comprehensive-guide-992bcd5f04de)

    - Padding: Set the padding values for the grid.

    - Spacing: Set the spacing between cells.

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
