import * as moment from "moment";

const isDev = process.env.NODE_ENV !== "production";

export function TimeLogger(template: string, ...args: any[]) {
    if (isDev) {
        console.log(
            `[${moment().format("YYYY-MM-DD HH:mm:ss")}] ${template}`,
            ...args
        );
    }
}
