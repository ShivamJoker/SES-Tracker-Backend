import { Stack } from "aws-cdk-lib";
import { AttributeType, TableV2 } from "aws-cdk-lib/aws-dynamodb";

export const createEventsTable = (stack: Stack, tableName: string) => {
  const sesEventsTable = new TableV2(stack, `${tableName}-table`, {
    tableName: tableName,
    partitionKey: { name: "PK", type: AttributeType.STRING },
    sortKey: { name: "SK", type: AttributeType.STRING },
  });

  sesEventsTable.addGlobalSecondaryIndex({
    indexName: "GSI1",
    partitionKey: { name: "GSI1PK", type: AttributeType.STRING },
    sortKey: { name: "GSI1SK", type: AttributeType.STRING },
  });

  sesEventsTable.addGlobalSecondaryIndex({
    indexName: "GSI2",
    partitionKey: { name: "GSI2PK", type: AttributeType.STRING },
    sortKey: { name: "GSI2SK", type: AttributeType.STRING },
  });

  sesEventsTable.addGlobalSecondaryIndex({
    indexName: "GSI3",
    partitionKey: { name: "GSI3PK", type: AttributeType.STRING },
    sortKey: { name: "GSI3SK", type: AttributeType.STRING },
  });

  return sesEventsTable;
};

export const DDB_INDEXES = [
  "PK",
  "SK",
  "GSI1PK",
  "GSI1SK",
  "GSI2PK",
  "GSI2SK",
  "GSI3PK",
  "GSI3SK",
];
