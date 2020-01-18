/**
 *
 * Elijah Cobb
 * elijah@elijahcobb.com
 * https://elijahcobb.com
 *
 *
 * Copyright 2019 Elijah Cobb
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 * to permit persons to whom the Software is furnished to do so, subject to the following filters:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

import * as Mongo from "mongodb";

import { ECArray, ECArrayList } from "@elijahjcobb/collections";
import { ECMDatabase } from "./ECMDatabase";
import { ECMObject, ECMObjectPropType } from "./ECMObject";

export type ECMFilterValue = string | number | (string | number | boolean)[] | Mongo.ObjectId;

export enum ECMFilterType {
	Equals = "$e",
	DoesNotEqual = "$ne",
	GreaterThan = "$gt",
	GreaterThanOrEqual = "$gte",
	LessThan = "$lt",
	LessThanOrEqual = "$lte"
}

export class ECMFilter<T> {

	public readonly key: keyof T;
	public readonly type: ECMFilterType;
	public readonly value: ECMFilterValue;

	public constructor(key: keyof T, type: ECMFilterType, value: ECMFilterValue) {

		this.key = key;
		this.type = type;
		this.value = value;

	}

}

export enum ECMSortType {
	GreatestToLeast = -1,
	LeastToGreatest = 1
}

export class ECMSort<T> {

	public readonly key: keyof T;
	public readonly type: ECMSortType;

	public constructor(key: keyof T, type: ECMSortType) {

		this.key = key;
		this.type = type;

	}

}

export enum ECMConditionType {
	Or = "$or",
	And = "$and"
}

export type Factory<Type, Props> = { new<Props>(): Type };

export class ECMQuery<Type extends ECMObject<Props>, Props extends ECMObjectPropType> {

	private readonly factory: Factory<Type, Props>;
	public filters: ECArrayList<ECMFilter<Props>>;
	public collection: string;
	public condition: ECMConditionType;
	public sort: ECMSort<Props>;
	public limit: number;

	public constructor(type: Factory<Type, Props>, condition: ECMConditionType = ECMConditionType.And, collection?: string) {

		this.filters = new ECArrayList<ECMFilter<Props>>();
		this.condition = condition;
		this.collection = collection;
		this.limit = -1;
		this.factory = type;
		this.collection = (new this.factory()).collection;

	}

	private generateQuery(): object {

		let query: object = {};

		this.filters.forEach((filter: ECMFilter<Props>) => {

			if (filter.type === ECMFilterType.Equals) {

				if (this.condition === ECMConditionType.Or) {

					let ors: object[] = query["$or"];
					if (!ors) ors = [];
					let obj: object = {};
					obj[filter.key as string] = filter.value;
					ors.push(obj);
					query["$or"] = ors;

				} else {

					query[filter.key as string] = filter.value;

				}

			} else {

				if (this.condition === ECMConditionType.Or) {

					let ors: object[] = query["$or"];
					if (!ors) ors = [];
					let obj: object = {};
					let subQuery: object = {};
					subQuery[filter.type] = filter.value;
					obj[filter.key as string] = subQuery;
					ors.push(obj);

					query["$or"] = ors;

				} else {

					let subQuery: object = query[filter.key as string] || {};
					subQuery[filter.type] = filter.value;
					query[filter.key as string] = subQuery;

				}

			}

		});

		return query;

	}

	public addFilter(filter: ECMFilter<Props>): void {

		this.filters.add(filter);

	}

	public setSort(sort: ECMSort<Props>): void {

		this.sort = sort;

	}

	public setCondition(condition: ECMConditionType): void {

		this.condition = condition;

	}

	public setLimit(limit: number): void {

		this.limit = limit;

	}

	public async getFirst(): Promise<Type> {

		this.limit = 1;
		return (await this.getAll()).get(0);

	}

	public async getAll(): Promise<ECArray<Type>> {

		let collection: Mongo.Collection = await ECMDatabase.getCollection(this.collection);
		let cursor: Mongo.Cursor = collection.find<object>(this.generateQuery());

		if (this.limit !== -1) cursor = cursor.limit(this.limit);

		if (this.sort) {

			let query: object = {};
			query[this.sort.key as string] = this.sort.type;
			cursor = cursor.sort(query);

		}

		let responsesUnformed: object[] = await cursor.toArray();
		let responses: Type[] = responsesUnformed.map((response: object) => {

			let object: Type = new this.factory();
			object.decode(response);
			return object;

		});

		return ECArray.initFromNativeArray(responses);
	}

	public static async getForId<Type extends ECMObject<Props>, Props extends ECMObjectPropType>(type: Factory<Type, any>, id: string): Promise<Type> {

		let query: ECMQuery<Type, Props> = new ECMQuery<Type, Props>(type);
		query.addFilter(new ECMFilter("_id" as keyof Props, ECMFilterType.Equals, new Mongo.ObjectId(id)));
		return await query.getFirst();

	}

}