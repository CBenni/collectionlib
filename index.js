/*
Holds an indexed collection of objects
@param indexes A list of properties to be indexed. Omit to autoindex.
*/

function IndexedCollection(indexes) {
	let self = this;
	if(indexes && !indexes.length) throw "Bad value for indexes";
	self.indexes = indexes;
	self.index = {}; // self.index[prop][value] is an array containing all elements in this IndexedCollection that have the property `prop` set to `value`
	self.items = [];
	if(indexes) for(let i=0;i<indexes.length;++i) {
		self.index[indexes[i]] = new Map(); // each of the indexes has a map "value => item"
	}
}

/*
Adds an item to the IndexedCollection
@param item the object to be added
*/
const hasOwn = Object.prototype.hasOwnProperty;
IndexedCollection.prototype.add = function(item) {
	let self = this;
	if(self.indexes === undefined) {
		let props = Object.keys(item);
		for(let i=0;i<props.length;++i) {
			let prop = props[i];
			if(hasOwn.call(item, prop)) self.addToIndex(prop, item);
		}
		self.items.push(item);
	} else {
		for(let i=0;i<self.indexes.length;++i) {
			self.addToIndex(self.indexes[i], item);
		}
		self.items.push(item);
	}
}

// updates all items from a specific query with the specified data
IndexedCollection.prototype.update = function(query, data) {
	let self = this;
	let items = self.QBE(query);
	console.log("upd: got "+items.length+" items to update");
	for(let i=0;i<items.length;++i) {
		let item = items[i];
		console.log("Handling item "+JSON.stringify(item));
		// update the indexes it belongs to
		let newProps = Object.keys(data);
		for(let j=0;j<newProps.length;++j) {
			let newProp = newProps[j];
			if(data[newProp] !== item[newProp]) {
				console.log("Property "+newProp+" doesnt match: "+item[newProp]+" !== "+data[newProp]);
				let index = self.index[newProp];
				if(index) {
					// the list of items that have the old value
					let list = index.get(item[newProp]);
					if(list) {
						// remove the item from the list
						list.splice(list.indexOf(item),1);
					}
					
					// the list of items that have the new value
					list = index.get(data[newProp]);
					// add the item
					if(list) {
						list.push(item);
					} else {
						self.index[newProp].set(data[newProp], [item]);
					}
				} else if(self.indexes === undefined) {
					// autoindex
					index = self.index[indexes[i]] = new Map();
					index.set(data[newProp], [item]);
				}
				item[newProp] = data[newProp];
				console.log("Updated item "+JSON.stringify(item));
			}
		}
	}
}

IndexedCollection.prototype.addToIndex = function(prop, item) {
	let self = this;
	let val = item[prop];
	let index = self.index[prop];
	if(!index) index = self.index[prop] = new Map();
	if(index.get(val)) {
		index.get(val).push(item);
	} else {
		index.set(val, [item]);
	}
}

/*
Gets items from the IndexedCollection (Query by Example)
@complexity O(nlogn(#props)*log(#items)+#items*#props)
*/
IndexedCollection.prototype.QBE = function(qbe) {
	let self = this;
	if(!qbe) return self.items;
	let props = Object.keys(qbe);
	if(props.length == 0) return self.items;
	let res = [];
	let bestprop, bestlist, bestlength = Infinity;
	// find the best index to use - O(m)
	for(let i=0;i<props.length;++i) {
		let prop = props[i];
		if(hasOwn.call(qbe, prop)) {
			let val = qbe[prop];
			if(self.index[prop]) {
				let list = self.index[prop].get(val);
				if(list.length == 0) return [];
				else if(list && list.length < bestlength) {
					bestprop = i;
					bestlist = list;
					bestlength = list.length;
				}
			} else if(bestlist === undefined) {
				bestlist = self.items;
				bestlength = self.items.length;
			}
		}
	}
	if(props.length == 1) return bestlist;
	console.log("Best index: "+props[bestprop]);
	for(let j=0;j<bestlist.length;++j) {
		let item = bestlist[j];
		let ok = true;
		for(let i=0;i<props.length;++i) {
			if(i===bestprop) continue;
			let prop = props[i];
			if(hasOwn.call(qbe, prop)) {
				let val = qbe[prop];
				if(val !== item[prop]) {
					ok = false;
					break;
				}
			}
		}
		if(ok) res.push(item);
	}
	return res;
}


IndexedCollection.prototype.get = function(prop, val) {
	let self = this;
	if(self.index[prop]) {
		return self.index[prop].get(val);
	} else {
		var res = [];
		for(let i=0;i<self.items.length;++i) {
			let item = self.items[i];
			if(item[prop] === val) {
				res.push(item);
			}
		}
		return res;
	}
}


function test1() {
	var coll = new IndexedCollection(["name", "id"]);
	coll.add({"name":"10000daysz","id":43414943,"modlogs":0,"enabled":1});
	coll.add({"name":"360chrism","id":37810366,"modlogs":1,"enabled":1});
	coll.add({"name":"5hizzle","id":22694682,"modlogs":1,"enabled":1});
	coll.add({"name":"911rennsport","id":42944190,"modlogs":0,"enabled":1});
	coll.add({"name":"a_seagull","id":19070311,"modlogs":1,"enabled":1});
	coll.add({"name":"acarebox","id":26181477,"modlogs":1,"enabled":1});
	coll.add({"name":"aircharged","id":101285851,"modlogs":0,"enabled":0});
	console.log("Added items:");
	console.log(coll.items);
	console.log("Getting channel 360chrism");
	console.log(coll.get("name", "360chrism"));
	console.log("Getting modlogs enabled channels");
	console.log(coll.get("modlogs",1));
	console.log("Getting channel 911rennsport if mod logs are enabled");
	console.log(coll.QBE({"modlogs":1,"name":"911rennsport"}));
	console.log("Getting modlogs disabled, but enabled channels");
	console.log(coll.QBE({"modlogs":0,"enabled":1}));
}
function test2() {
	var coll = new IndexedCollection();
	coll.add({"name":"10000daysz","id":43414943,"modlogs":0,"enabled":1});
	coll.add({"name":"360chrism","id":37810366,"modlogs":1,"enabled":1});
	coll.add({"name":"5hizzle","id":22694682,"modlogs":1,"enabled":1});
	coll.add({"name":"911rennsport","id":42944190,"modlogs":0,"enabled":1});
	coll.add({"name":"a_seagull","id":19070311,"modlogs":1,"enabled":1});
	coll.add({"name":"acarebox","id":26181477,"modlogs":1,"enabled":1});
	coll.add({"name":"aircharged","id":101285851,"modlogs":0,"enabled":0});
	console.log("Added items to autoindexed collection:");
	console.log(coll.items);
	console.log("Getting channel 360chrism");
	console.log(coll.get("name", "360chrism"));
	console.log("Getting modlogs enabled channels");
	console.log(coll.get("modlogs",1));
	console.log("Getting channel 911rennsport if mod logs are enabled");
	console.log(coll.QBE({"modlogs":1,"name":"911rennsport"}));
	console.log("Getting modlogs disabled, but enabled channels");
	console.log(coll.QBE({"modlogs":0,"enabled":1}));
}
function test3() {
	var coll = new IndexedCollection();
	coll.add({"name":"10000daysz","id":43414943,"modlogs":0,"enabled":1});
	coll.add({"name":"360chrism","id":37810366,"modlogs":1,"enabled":0});
	coll.add({"name":"5hizzle","id":22694682,"modlogs":1,"enabled":0});
	coll.add({"name":"911rennsport","id":42944190,"modlogs":0,"enabled":1});
	coll.add({"name":"a_seagull","id":19070311,"modlogs":1,"enabled":1});
	coll.add({"name":"acarebox","id":26181477,"modlogs":1,"enabled":1});
	coll.add({"name":"aircharged","id":101285851,"modlogs":0,"enabled":0});
	console.log("Added items to autoindexed collection:");
	console.log(coll.items);
	console.log("Getting channel 360chrism");
	console.log(coll.get("name", "360chrism"));
	console.log("Getting modlogs enabled channels");
	console.log(coll.get("modlogs",1));
	console.log("Getting channel 911rennsport if mod logs are enabled");
	console.log(coll.QBE({"modlogs":1,"name":"911rennsport"}));
	console.log("Getting modlogs enabled, but disabled channels");
	console.log(coll.QBE({"modlogs":1,"enabled":0}));
	console.log("Disabling mod logs for these channels");
	coll.update({enabled: 0, modlogs: 1},{modlogs:0});
	console.log("Getting modlogs disabled, but enabled channels after update");
	console.log(coll.QBE({"modlogs":1,"enabled":0}));
}
test3()

module.export = IndexedCollection;