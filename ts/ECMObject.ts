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

import { ECMDatabase } from "./ECMDatabase";
import * as Mongo from "mongodb";

export interface ECMObjectPropType {

	[key: string]: any;

}

export abstract class ECMObject<Props extends ECMObjectPropType> {

	public readonly collection: string;
	public id: string | undefined;
	public updatedAt: number | undefined;
	public createdAt: number | undefined;
	public props: Props = {} as Props;

	protected constructor(collection: string) {

		this.collection = collection;

	}

	protected async objectDidCreate(): Promise<void> {

		console.log(`Created ${this.collection} with id '${this.id}'.`);

	}

	protected async objectDidUpdate(): Promise<void> {

		console.log(`Updated ${this.collection} with id '${this.id}'.`);

	}

	protected async objectDidDelete(): Promise<void> {

		console.log(`Deleted ${this.collection} with id '${this.id}'.`);

	}

	public toJSON(): object {

		const json: {id: string | undefined, updatedAt: number | undefined, createdAt: number | undefined} = this.props;

		json.id = this.id;
		json.createdAt = this.updatedAt;
		json.updatedAt = this.createdAt;

		return json;

	}

	public encode(): object {

		const json: {updatedAt: number | undefined, createdAt: number | undefined} = this.props as object;

		json["updatedAt"] = this.updatedAt;
		json["createdAt"] = this.createdAt;

		return json;

	}

	public decode(document: object): void {

		let keys: string[] = Object.keys(document);

		for (let i: number = 0; i < keys.length; i ++) {

			let key: string = keys[i];
			let value: any = document[key];

			if (key === "_id") this.id = value;
			else if (key === "updatedAt") this.updatedAt = value;
			else if (key === "createdAt") this.createdAt = value;
			else this.props[key] = value;

		}

	}

	public print(): void {

		console.log("ECMObject {");

		console.log("\tid = " + this.id + ",");
		console.log(`\tupdatedAt = ${this.updatedAt} (${new Date(this.updatedAt).toString()}),`);
		console.log(`\tcreatedAt = ${this.updatedAt} (${new Date(this.createdAt).toString()}),`);

		console.log("\tprops = {");
		let propKeys: string[] = Object.keys(this.props);
		propKeys = propKeys.sort();
		for (let i: number = 0; i < propKeys.length; i ++) {

			let key: string = propKeys[i];
			let value: any = this.props[key];
			let comma: string = i === propKeys.length - 1 ? "" : ",";
			console.log(`\t\t${key} = ${value}${comma}`);

		}

		console.log("\t}");

		console.log("}");

	}


	public keys(): (keyof this)[] {

		return Object.keys(this) as (keyof this)[];

	}

	public async fireUpdatedAt(): Promise<void> {

		try {

			let collection: Mongo.Collection = await ECMDatabase.getCollection(this.collection);
			await collection.updateOne({ _id: new Mongo.ObjectId(this.id) }, { $set: { updatedAt: Date.now() } });

		} catch (e) {

			this.handleInternalError(e);

		}

	}

	public async create(): Promise<void> {

		if (this.id !== undefined && this.id !== null) {

			throw ECErrorStack.newWithMessageAndType(
				ECErrorOriginType.FrontEnd,
				ECErrorType.NullOrUndefined,
				new Error(`You cannot create an object that already exists.`)
			).withGenericError();

		}

		this.createdAt = Date.now();
		this.updatedAt = Date.now();

		try {

			let collection: Mongo.Collection = await ECMDatabase.getCollection(this.collection);
			let result: Mongo.InsertOneWriteOpResult = await collection.insertOne(this.encode());
			this.id = result.insertedId.toHexString();

		} catch (e) {

			this.handleInternalError(e);

		}

		await this.objectDidCreate();

	}

	public async update(): Promise<void> {

		return this.updateProps();
	}

	public async updateProps(...keys: (keyof Props)[]): Promise<void> {

		if (this.id === undefined || this.id === null) {

			throw ECErrorStack.newWithMessageAndType(
				ECErrorOriginType.FrontEnd,
				ECErrorType.NullOrUndefined,
				new Error(`You cannot update an object that does not exist.`)
			).withGenericError();

		}
		this.updatedAt = Date.now();

		try {

			let collection: Mongo.Collection = await ECMDatabase.getCollection(this.collection);

			let query: object = {};

			if (!keys || keys.length === 0) keys = Object.keys(this.props);
			for (let i: number = 0; i < keys.length; i ++) {

				const key: string = keys[i] as string;
				const value: any = this.props[key];

				let mode: string = value === undefined ? "$unset" : "$set";
				let subQuery: object = query[mode];
				if (!subQuery) subQuery = {};
				subQuery[key] = value === undefined ? "" : value;
				query[mode] = subQuery;

			}

			await collection.updateOne({ _id: new Mongo.ObjectId(this.id) }, query);

		} catch (e) {

			this.handleInternalError(e);

		}

		await this.objectDidUpdate();

	}

	public async delete(): Promise<void> {

		if (this.id === undefined || this.id === null) {

			throw ECErrorStack.newWithMessageAndType(
				ECErrorOriginType.FrontEnd,
				ECErrorType.NullOrUndefined,
				new Error(`You cannot delete an object that does not exist.`)
			).withGenericError();

		}

		try {

			let collection: Mongo.Collection = await ECMDatabase.getCollection(this.collection);
			await collection.deleteOne({ _id: new Mongo.ObjectId(this.id) });

		} catch (e) {

			this.handleInternalError(e);

		}

		await this.objectDidDelete();

	}

	public async fetch(id: string): Promise<void> {

		let response: any;

		try {

			let collection: Mongo.Collection = await ECMDatabase.getCollection(this.collection);
			let responses: any[] = await collection.find(new Mongo.ObjectId(id)).toArray();
			response = responses[0];

		} catch (e) {

			this.handleInternalError(e);

		}

		if (!response) {

			throw ECErrorStack.newWithMessageAndType(
				ECErrorOriginType.FrontEnd,
				ECErrorType.NullOrUndefined,
				new Error(`${this.collection} with id '${id}' does not exist.`)
			).withGenericError();

		}

		this.decode(response);

	}

}