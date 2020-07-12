export interface CheckResult {
    file: string;
    line: number;
    column: number;
    msg: string;
    severity: string;
}
