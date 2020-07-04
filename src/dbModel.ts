export interface DbField {
    name: string;
    description: string;
    type: string,
    mandatory: boolean;
    format: string;
    isPK: boolean;
    // isUnique: boolean;
    isKey: boolean;
}

export interface DbIndex {
    name: string;
    isPK: boolean;
    isUnique: boolean;
    fields: string[];
}

export interface DbTable {
    name: string;
    description: string;
    fields: DbField[];
    indexes: DbIndex[];
}

export interface DbFile extends DbTable {
    database: string;
}
