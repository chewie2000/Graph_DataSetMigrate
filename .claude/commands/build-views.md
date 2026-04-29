Create two Snowflake SQL view files in a `sql/` directory at the root of this repository.
The views make the Graph_DataSetMigrate plugin's two data sources easy to consume directly
in Sigma — a workbook author just points a dataset element at the view rather than pasting
raw SQL.

## Instructions

1. Create the directory `sql/` if it does not already exist.

2. Create `sql/v_nodes_data.sql` with this content:

```sql
-- View: V_NODES_DATA
-- Purpose: Supplies the Nodes data source for the Graph_DataSetMigrate Sigma plugin.
-- One row per unique node (dataset or workbook), latest run only.
-- Sigma column mappings: node_id, node_name, node_type, node_subtype, status, symbol_size

CREATE OR REPLACE VIEW V_NODES_DATA AS

WITH latest_deps AS (
    SELECT MAX(RUN_ID) AS RUN_ID
    FROM SIGMA_DATASET_DEPENDENCIES
),
latest_wb AS (
    SELECT MAX(RUN_ID) AS RUN_ID
    FROM SIGMA_WORKBOOK_MIGRATION_SUMMARY
)

SELECT DISTINCT
    DATASET_ID                                AS node_id,
    DATASET_NAME                              AS node_name,
    'dataset'                                 AS node_type,
    RELATION_TYPE                             AS node_subtype,
    DATASET_MIGRATION_STATUS                  AS status,
    GREATEST(DOWNSTREAM_CHILD_COUNT + 10, 10) AS symbol_size
FROM SIGMA_DATASET_DEPENDENCIES
WHERE RUN_ID = (SELECT RUN_ID FROM latest_deps)

UNION ALL

SELECT DISTINCT
    WORKBOOK_ID      AS node_id,
    WORKBOOK_NAME    AS node_name,
    'workbook'       AS node_type,
    MIGRATION_STATUS AS node_subtype,
    MIGRATION_STATUS AS status,
    10               AS symbol_size
FROM SIGMA_WORKBOOK_MIGRATION_SUMMARY
WHERE RUN_ID = (SELECT RUN_ID FROM latest_wb);
```

3. Create `sql/v_edges_data.sql` with this content:

```sql
-- View: V_EDGES_DATA
-- Purpose: Supplies the Edges data source for the Graph_DataSetMigrate Sigma plugin.
-- One row per directed dependency edge (dataset→dataset or dataset→workbook), latest run only.
-- Sigma column mappings: source, target, edge_type

CREATE OR REPLACE VIEW V_EDGES_DATA AS

WITH latest_deps AS (
    SELECT MAX(RUN_ID) AS RUN_ID
    FROM SIGMA_DATASET_DEPENDENCIES
)

-- Dataset → Dataset edges
SELECT DISTINCT
    PARENT_ID  AS source,
    DATASET_ID AS target,
    'ds-ds'    AS edge_type
FROM SIGMA_DATASET_DEPENDENCIES
WHERE PARENT_ID IS NOT NULL
  AND RUN_ID = (SELECT RUN_ID FROM latest_deps)

UNION ALL

-- Dataset → Workbook edges
SELECT DISTINCT
    d.DATASET_ID  AS source,
    w.WORKBOOK_ID AS target,
    'ds-wb'       AS edge_type
FROM SIGMA_WORKBOOK_SOURCE_DETAILS w
JOIN SIGMA_DATASET_DEPENDENCIES d
    ON w.DATASET_ID = d.DATASET_ID
WHERE w.DATASET_ID IS NOT NULL
  AND d.RUN_ID = (SELECT RUN_ID FROM latest_deps);
```

4. Create `sql/README.md` explaining:
   - What these views are for
   - That the CREATE OR REPLACE VIEW statements need to be run in the same Snowflake database/schema
     where the DataSetMigrateHelper_SF stored procedures wrote their output tables
     (SIGMA_DATASET_DEPENDENCIES, SIGMA_WORKBOOK_SOURCE_DETAILS, SIGMA_WORKBOOK_MIGRATION_SUMMARY)
   - How to use the views in Sigma: create a dataset element, switch to SQL mode, and write
     `SELECT * FROM V_NODES_DATA` or `SELECT * FROM V_EDGES_DATA`
   - The column names each view produces and which plugin editor field they map to

5. Stage and commit all three files with the message:
   "Add Snowflake view definitions for plugin data sources"
