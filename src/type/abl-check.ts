import { Parameter, TempTable, Method, Variable, Field, IPosition, IRange, TYPE, IUri } from './abl';

export class AblTypeCheck {

    static isField(object: any): object is Field {
        if (!object) return false;
        return object['type'] == TYPE.FIELD;
    }

    static isVariable(object: any): object is Variable {
        if (!object) return false;
        return object['type'] == TYPE.VARIABLE;
    }

    static isParameter(object: any): object is Parameter {
        if (!object) return false;
        return object['type'] == TYPE.PARAMETER;
    }

    static isTempTable(object: any): object is TempTable {
        if (!object) return false;
        return object['type'] == TYPE.TEMP_TABLE;
    }

    static isMethod(object: any): object is Method {
        if (!object) return false;
        return object['type'] == TYPE.METHOD;
    }

    static hasPosition(object: any): object is IPosition {
        if (!object) return false;
        return 'position' in object;
    }

    static hasRange(object: any): object is IRange {
        if (!object) return false;
        return 'range' in object;
    }

    static hasUri(object: any): object is IUri {
        if (!object) return false;
        return 'uri' in object;
    }

}