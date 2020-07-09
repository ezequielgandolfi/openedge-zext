import { AblType } from './abl';

export class AblTypeCheck {

    static isParameter(object: any): object is AblType.Parameter {
        return 'direction' in object;
    }

    static isTempTable(object: any): object is AblType.TempTable {
        return 'referenceTable' in object;
    }   

}