export interface Field {
    name: string;
    description: string;
    type: string,
    mandatory: boolean;
    format: string;
    isPK: boolean;
    isKey: boolean;
}

export interface Index {
    name: string;
    isPK: boolean;
    isUnique: boolean;
    fields: string[];
}

export interface Table {
    name: string;
    description: string;
    fields: Field[];
    indexes: Index[];
}

export interface DbFile extends Table {
    database: string;
}
