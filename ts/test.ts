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

import { ECMObject, ECMDatabase, ECMQuery, ECMFilter, ECMFilterType, ECMSort, ECMSortType, ECMConditionType } from "./index";
import { ECErrorStack } from "@elijahjcobb/error";
import { ECArray } from "@elijahjcobb/collections";

interface UserProps {
	name: string;
	age: number;
}

class User extends ECMObject<UserProps> {

	public constructor() {

		super("user");

	}

}

(async (): Promise<void> => {

	await ECMDatabase.connect("mongodb://localhost:27017", "mongo");

	let query: ECMQuery<User, UserProps> = new ECMQuery(User, ECMConditionType.And);
	query.addFilter(new ECMFilter("age", ECMFilterType.GreaterThan, 12));
	query.addFilter(new ECMFilter("age", ECMFilterType.LessThan, 40));
	query.setSort(new ECMSort("name", ECMSortType.LeastToGreatest));
	let responses: ECArray<User> = await query.getAll();

	responses.forEach((user: User) => {

		 user.print();

	});

	ECMQuery.getForId(User, "wefwefwef");


})().then(() => {}).catch((err: any) => {
	if (err instanceof ECErrorStack) err.print();
	else console.error(err);
});

