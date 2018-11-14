export class GraphElement {
    label: string;
    name: Date;
    value: number;
}

// tslint:disable-next-line:max-classes-per-file
export class GraphSeries {
    name: string;
    series: GraphElement[] = [];
}

// tslint:disable-next-line:max-classes-per-file
export default class GraphInput {
    data: GraphSeries[] = [];
}
