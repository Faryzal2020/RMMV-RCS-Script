//=============================================================================
// Fary_CraftSystem.js
//=============================================================================

/*:
 * @plugindesc Craft items, weapons and armors based on category with time needed to craft
 * @author Faryzal "Faryzal2020" Andhika
 * @version 1.0
 *
 * @param Variable ID
 * @desc Variable ID for storing item ID
 * @default 1
 * 
 * @param Equip Text
 * @desc Text used for item's equipment type in status display 
 * @default Equip
 * 
 * @param Type Text
 * @desc Text used for item's equipment type in status display 
 * @default Type
 * 
 * @param Ingredients Text
 * @desc Text used for indicating an item's crafting ingredients
 * @default Materials:
 * 
 * @param Time Text
 * @desc Text used for time needed to craft an item
 * @default Time to craft:
 * 
 * @param Item Crafted Text
 * @desc Text used after crafting an item
 * @default Item crafted:
 * 
 *
 * @help
 *  
 * To make an event into a crafting station, put "<manufacturer>" in its note,
 * and then put this script call in the event:
 *   this.openMenu(this._eventId, 0);		# 0 means it will open crafting menu for category 0 only
 *
 * To make an item/weapon/armor craftable, put this in their notetag:
 *    <recipe>
 *    i: 1, 5	# requires 5 of item #1
 *    w: 3, 2	# requires 2 of weapon #3
 *    a: 2, 5	# requires 5 of armor #2
 *    t: 20	    # requires 20 seconds to craft
 *    y: 2      # yields 2 of this item when crafted
 *    </recipe>
 *
 * Group your craftable items in categories by assigning an item as a "recipe book":
 *    <recipe_book>
 *    category: x				# recipe book is of category #x
 *    catname: Crafting Table	# category #x will be named as "Crafting Table"
 *    i: 1, 3, 4				# recipe book contains the recipes of items with ID 1, 3, and 4
 *    w: 3 						# recipe book contains the recipes of weapon with ID 3
 *    a: 2, 1 					# recipe book contains the recipes of armors with ID 2, and 1
 *    </recipe_book>
 *
 */
var Fary = Fary || {};
Fary.CRAFT = Fary.CRAFT || {};
 
(function(){
	var parameters = PluginManager.parameters('Fary_CraftSystem');
    var equipText = String(parameters['Equip Text'] || 'Equip');
    var typeText = String(parameters['Type Text'] || 'Type');
    var ingredientsText = String(parameters['Ingredients Text'] || 'Ingredients:');
	var timeText = String(parameters['Time Text'] || 'Time to craft:');
	var itemCraftedText = String(parameters['Item Crafted Text'] || 'Item crafted:');
	var varId = parseInt(parameters['Variable ID'] || 1);
	var eID = 0;
	var timeLeft = 0;

	/*----------------------------------------------
	* Game_Interpreter
	*---------------------------------------------*/

	Game_Interpreter.prototype.craftmenu = function(eventId, category) {
		if (category == undefined || category == null) category = 0;
		console.log('Event ID RAW = '+eventId);
		eID = eventId;
		console.log('Open Menu');
		SceneManager.push(Scene_CraftingMenu)
		SceneManager.prepareNextScene(category)
	}

	Fary.CRAFT.isCraft = function(eventId) {
		return $gameMap.event(eventId) && $gameMap.event(eventId).manufacture();
	}

	Fary.CRAFT.isCrafting = function(eventId) {
		return Fary.CRAFT.isCraft(eventId) && $gameMap.event(eventId).manufacture()._manufactures;
	}

	Fary.CRAFT.isReady = function(eventId) {
		return Fary.CRAFT.isCrafting(eventId) ? $gameMap.event(eventId).manufacture().isReady() : false;
	}

	Fary.CRAFT.harvest = function(eventId, varId) {
		$gameVariables._data[varId] = 0;
		if (Fary.CRAFT.isReady(eventId)) {
			var itemId = $gameMap.event(eventId).manufacture()._manufactures.itemId;
			var type = $gameMap.event(eventId).manufacture()._manufactures.itemType;
			var amount = $gameMap.event(eventId).manufacture()._manufactures.amount;
			var item;
			var yields = Fary.CRAFT.getYields(eventId);
			var totalAmount = yields * amount;
			var s = '';
			switch (type) {
				case 'item': item = $dataItems[itemId]; break;
				case 'weapon': item = $dataWeapons[itemId]; break;
				case 'armor': item = $dataArmors[itemId]; break;
			}
			if (item) {
				$gameParty.gainItem(item, totalAmount);
				if(totalAmount > 1){ s = 's';}
				$gameMessage.setPositionType(1);
				$gameMessage.add("Obtained "+totalAmount+"x "+item.name+s);
				var name = item.name;
			} else {
				var name = '';
			}

			if (varId > 0 && name != '') {
				$gameMap.event(eventId).manufacture().resetCraft();
				$gameMap.event(eventId).updateProgress();
				$gameVariables._data[varId] = name;
			}
		}
	}

	Fary.CRAFT.getYields = function(eventId) {
		if (Fary.CRAFT.isCrafting(eventId)){
			var item = Fary.CRAFT.getItemCraft(eventId);
	       	var amount;
	       	console.log(item);

	       	item._ingredients.forEach(function(ing){
	       		if ( ing['item'] == 'yields' ) {
	       			amount = ing['amount'];
	       		}
	       	}, this);
	       	return amount;
	    } else {
	    	return 1;
	    }
	}

	Fary.CRAFT.remove = function(eventId) {
		if (Fary.CRAFT.isCraft(eventId)) {
			$gameMap.event(eventId).manufacture().resetCraft();
			$gameMap.event(eventId).updateProgress();
		}
	}

	Fary.CRAFT.craft = function(eventId,itemId,itemType,duration,amount) {
		console.log('Fary.CRAFT.craft:\n'+itemId+'\n'+duration);
		console.log($gameMap.event(eventId));
		console.log(eventId);
		$gameMap.event(eventId).startCraft(itemId,itemType,duration,amount);
		$gameMessage.setPositionType(1);
		$gameMessage.add("Crafting has been started and \nwill be completed in: "+duration+" Seconds");
	}

	Fary.CRAFT.update = function(mapId) {
		var events = $gameMap.events();
		for (var e in events) {
			if (events[e].event().meta.manufacture) events[e].updateManufacture();
		}
	}
	
	Fary.CRAFT.timeCheck = function(eventId, varId) {
		$gameVariables._data[varId] = 0;
		if (Fary.CRAFT.isCrafting(eventId)){
			var time = $gameMap.event(eventId).manufacture().checkTime();
			console.log('TimeCheck:'+time);
			if (varId > 0) {
				$gameVariables._data[varId] = time;
			}
		}
	}

	Fary.CRAFT.getTimeLeft = function(eventId) {
		if (Fary.CRAFT.isCrafting(eventId)){
			return $gameMap.event(eventId).manufacture().checkTime();
		}
	}

	Fary.CRAFT.getDuration = function(eventId) {
		if (Fary.CRAFT.isCrafting(eventId)){
			return $gameMap.event(eventId).manufacture().getManDuration();
		}
	}

	Fary.CRAFT.getItemCraft = function(eventId) {
		if (Fary.CRAFT.isCrafting(eventId)){
			return $gameMap.event(eventId).manufacture().getItem();
		}
	}

	Fary.CRAFT.getItemAmount = function(eventId) {
		if (Fary.CRAFT.isCrafting(eventId)){
			return $gameMap.event(eventId).manufacture().getItemAmount();
		}
	}



	/*----------------------------------------------
	* DataManager
	*---------------------------------------------*/
	var _Fary_DataManager_createGameObjects = DataManager.createGameObjects;
	DataManager.createGameObjects = function() {
		_Fary_DataManager_createGameObjects.call(this);
		this.load_recipeBooks();
		this.load_ingredientLists();
	}

	DataManager.load_recipeBooks = function() {
		$dataItems.forEach(function(item){
			if (item == null) {return;}
			item._recipe_book = null;
			if (item.note.match(/<recipe_book>[\s\S]*<\/recipe_book>/m)){
				item._recipe_book = {'recipes':[]};
				var cat;
				if ((cat = item.note.match(/category:\s*(\d+)\ncatname:\s*(.+)/m))){
					item._recipe_book['category'] = parseInt(cat[1]);
					item._recipe_book['catname'] = cat[2];
					item._recipe_book['max'] = 1;
					item._recipe_book['speed'] = 100;
					console.log(cat[2]);
					var rec;
					var db;
					item.note.match(/([iwams]:\s*[\d+,\s]*)/gim).forEach(function(recipe_line){
						rec = recipe_line.match(/([iwams]):\s*([\d+,\s]*)/i);
						console.log(rec[1]);
						switch (rec[1]){
							case 'w': db = $dataWeapons; break;
							case 'a': db = $dataArmors; break;
							case 'i': db = $dataItems; break;
							default: break;
						}
						if ( rec[1] == 'm' ) {
							if ( rec[2] == null ){db=1; return;}else{db=rec[2];}
							item._recipe_book['max'] = rec[2];
							console.log(rec[2]);
						} else if ( rec[1] == 's' ) {
							if ( rec[2] == null ){db=100; return;}else{db=rec[2];}
							item._recipe_book['speed'] = rec[2];
							console.log(rec[2]);
						} else {
							rec[2].split(',').forEach(function(id){
								console.log(rec[2]);
								item._recipe_book['recipes'].push(db[parseInt(id)]);
							}, this);
						}
					}, this);
				}
			}
		}, this);
	}

	DataManager.load_ingredientLists = function(){
		var dbs = [$dataItems, $dataWeapons, $dataArmors];
		var count = 0;
		dbs.forEach(function(db){
			count += 1;
			db.filter(function(obj){return obj != null;}).forEach(function(item){
				item._ingredients = null;
				if (item.note.match(/<recipe>[\s\S]*<\/recipe>/gim)){
					item._ingredients = [];
					var type;
					switch (count) {
						case 1: type = 'item'; break;
						case 2: type = 'weapon'; break;
						case 3: type = 'armor'; break;
					}
					item._itemType = type;

					item.note.match(/([iwa]:\s*\d+,\s*\d+|[t]:\s*\d+)|([y]):\s*(\d+)/gim).forEach(function(ing_line){
						var ing = ing_line.match(/([iwa]):\s*(\d+),\s*(\d+)|([t]):\s*(\d+)|([y]):\s*(\d+)/i);
						var ing_db;
						var needed;
						if (ing[1] != null){
							switch (ing[1]){
								case 'w': ing_db = $dataWeapons[parseInt(ing[2])]; break;
								case 'a': ing_db = $dataArmors[parseInt(ing[2])]; break;
								case 'i': ing_db = $dataItems[parseInt(ing[2])]; break;
							}
						} else {
							if (ing[4] == 't'){
								ing_db = timeText;
							} else {
								if (ing[6] == 'y'){
									ing_db = 'yields';
								}
							}
						}
						if (ing_db == timeText){
							needed = parseInt(ing[5]);
						} else if (ing_db != 'yields'){
							needed = parseInt(ing[3]);
						} else {
							needed = parseInt(ing[7]);
						}
						item._ingredients.push({'item': ing_db, 'amount':needed});
					},this);
				}
			},this);
		},this);
	}

	var _Fary_DataManager_makeSaveContents = DataManager.makeSaveContents;
	DataManager.makeSaveContents = function() {
	    var contents = _Fary_DataManager_makeSaveContents.call(this);
	    var recipe_books = {};
	    $dataItems.filter(function(item){return item != null && item._recipe_book != null;}).forEach(function(item){
	    	var rb_ids = [];
	    	item._recipe_book.recipes.forEach(function(recipe){
	    		if (DataManager.isItem(recipe)) rb_ids.push("i" + recipe.id);
	    		else if (DataManager.isWeapon(recipe)) rb_ids.push("w" + recipe.id);
	    		else if (DataManager.isArmor(recipe)) rb_ids.push("a" + recipe.id);
	    	},this);
	    	recipe_books[item.id] = rb_ids;
	    },this);
	    contents.recipe_books       = recipe_books;
	    return contents;
	};

	var _Fary_DataManager_extractSaveContents = DataManager.extractSaveContents;
	DataManager.extractSaveContents = function(contents) {
		_Fary_DataManager_extractSaveContents.call(this, contents);
		var recipe_books = contents.recipe_books;
		var rex;
		for (var key in recipe_books){
			$dataItems[key]._recipe_book['recipes'] = [];
			recipe_books[key].forEach(function(book){
				rex  = book.match(/([iwa])(\d+)/i);
				switch (rex[1]){
					case 'i': $dataItems[key]._recipe_book['recipes'].push($dataItems[parseInt(rex[2])]);
						break;
					case 'w': $dataItems[key]._recipe_book['recipes'].push($dataWeapons[parseInt(rex[2])]);
						break;
					case 'a': $dataItems[key]._recipe_book['recipes'].push($dataArmors[parseInt(rex[2])]);
						break;
				}
			}, this);
			//console.log($dataItems[key]);
		}
	};

	/*----------------------------------------------
	* Scene_CraftingMenu
	*---------------------------------------------*/
	function Scene_CraftingMenu() {
		this.initialize.apply(this, arguments);
	}
	
	Scene_CraftingMenu.prototype = Object.create(Scene_MenuBase.prototype);
	Scene_CraftingMenu.prototype.constructor = Scene_CraftingMenu;
	
	Scene_CraftingMenu.prototype.initialize = function(){
		Scene_MenuBase.prototype.initialize.call(this);
	};
	
	Scene_CraftingMenu.prototype.prepare = function(category) {
		this._category = category;
		this.getCatData(category);
		console.log(this._catName);
	};

	Scene_CraftingMenu.prototype.getCatData = function(category) {
		var catname = '';
		var max;
		var speed;
		$dataItems.forEach(function(item){
			if (item == null) {return;}
			if (item._recipe_book){
				if (item._recipe_book['category'] == category){
					catname = item._recipe_book['catname'];
					max = item._recipe_book['max'];
					speed = item._recipe_book['speed'];
				}
			}
		}, this);
		this._catName = catname;
		this._max = parseInt(max);
		this._speed = speed;
	};
	
	Scene_CraftingMenu.prototype.create = function(){
		Scene_MenuBase.prototype.create.call(this);

		this.createCategoryWindow();
		this.createProcessWindow();
		this.createItemWindow();
		this.createItemStatusWindow();
		this.createIngredientsWindow();
		this.createInputWindow();

		this._messageWindow = new Window_Message();
		this.addWindow(this._messageWindow);
	    this._messageWindow.subWindows().forEach(function(window) {
	        this.addWindow(window);
	    }, this);

	    if ( Fary.CRAFT.isCrafting(eID) ) {
	    	console.log('IS CRAFTING');
	    	this._counter = Fary.CRAFT.getTimeLeft(eID);
	    	this._duration = Fary.CRAFT.getDuration(eID);
	    	this._item = Fary.CRAFT.getItemCraft(eID);
	    	this.updateSceneCrafting();
	    }

	};

	Scene_CraftingMenu.prototype.createCategoryWindow = function(){
		this._categoryWindow = new Window_CraftingCategory(this._catName, this._max, this._speed);
		this.addWindow(this._categoryWindow);
	}

	Scene_CraftingMenu.prototype.createItemWindow = function(){
		this._indexWindow = new Window_CraftingItems(
			0, this._categoryWindow.height, 300,
			Graphics.height-this._categoryWindow.height-150, this._category
		);
		this._indexWindow.setHandler('cancel', this.popScene.bind(this));
		this._indexWindow.setHandler('ok', this.onCraft.bind(this));
		this.addWindow(this._indexWindow);
	}

	Scene_CraftingMenu.prototype.createItemStatusWindow = function(){
		this._statusWindow = new Window_CraftingItemStatus(this._indexWindow.width, this._categoryWindow.height, Graphics.width-this._indexWindow.width);
		this.addWindow(this._statusWindow);
		this._indexWindow.setStatusWindow(this._statusWindow);
	}

	Scene_CraftingMenu.prototype.createProcessWindow = function(){
		var y = Graphics.height-150;

		this._processWindow = new Window_Process(
			0, y, 300, Graphics.height-y
		);
		this.addWindow(this._processWindow);
	}

	Scene_CraftingMenu.prototype.createIngredientsWindow = function(){
		this._ingredientsWindow = new Window_CraftingIngredients(this._indexWindow.width, this._statusWindow.y+this._statusWindow.height, Graphics.width-this._indexWindow.width, Graphics.height-this._statusWindow.y-this._statusWindow.height, this._speed);
		this.addWindow(this._ingredientsWindow);
		this._indexWindow.setIngredientsWindow(this._ingredientsWindow);
	}

	Scene_CraftingMenu.prototype.createInputWindow = function(){
		var height = 150;
		var y = (150-height)/2;
		this._inputWindow = new Window_InputAmount(0, this._indexWindow.height+this._categoryWindow.height+y, this._indexWindow.width, height);
		this._inputWindow.setHandler('cancel', function() {
			this._inputWindow.deactivate();
			this._indexWindow.activate();
			this._processWindow.show();
			this._inputWindow.hide();
		}.bind(this));
		this._inputWindow.setHandler('ok', function() {
			this._inputWindow.deactivate();
			this._indexWindow.activate();
			this._processWindow.show();
			this._inputWindow.hide();
			var item = this._indexWindow.item();
			var duration = this._inputWindow.getDuration();
			var amount = this._inputWindow.getAmount();
			this.startCraft(item, duration, amount);
		}.bind(this));
		this.addWindow(this._inputWindow);
		this._inputWindow.hide();
		this._inputWindow.setIngredientsWindow(this._ingredientsWindow);
		this._inputWindow.setIndexWindow(this._indexWindow);
	}

	Scene_CraftingMenu.prototype.onCraft = function(){
		if(Fary.CRAFT.isCrafting(eID)) {
			if (Fary.CRAFT.isReady(eID)) {
				this._indexWindow.playOkSound();
				Fary.CRAFT.harvest(eID, varId);
				Fary.CRAFT.remove(eID);
				this._processWindow.clear();
				console.log('CRAFTING COMPLETED');
				this._indexWindow.refresh();
				this._ingredientsWindow.refresh();
				this._inputWindow.deactivate();
				this._indexWindow.activate();
				return;
			} else {
				console.log('CRAFTING IN PROGRESS');
				this._indexWindow.playBuzzerSound();
				return;
			}
			this._indexWindow.activate();
			return;
		}
		console.log('ONCRAFT');
		console.log(Fary.CRAFT.isCrafting(eID));
		this._indexWindow.playOkSound();
		var item = this._indexWindow.item();
		var duration = 1;
		var yields = 1;

		item._ingredients.forEach(function(ing){
			if (ing['item'] == timeText){
				duration = ing['amount'];
			} else if (ing['item'] == 'yields'){
				yields = ing['amount'];
			}
		}, this);
		duraChange = parseInt((duration*(100-this._speed))/100);
		console.log('MAX:');
		console.log(this._max);
		this._inputWindow.start(item, duration, yields, duraChange, this._max);
	};

	Scene_CraftingMenu.prototype.startCraft = function(item, duration, amount){
		this.loseIngredients(item, amount);
		this._indexWindow.refresh();
		console.log('Event ID = '+eID);
		Fary.CRAFT.craft(eID, item.id, item._itemType, duration, amount);
		this._counter = duration;
		this._duration = duration;
		this._item = item;
		console.log(amount);
		console.log('CRAFTING STARTED');
		this.updateSceneCrafting();
	};

	Scene_CraftingMenu.prototype.updateSceneCrafting = function(){
		var percentage = Math.max((100*this._counter)/this._duration,0);
		percentage = (parseInt(percentage))/100;
		this._inputWindow.deactivate();
		this._indexWindow.activate();

		if(Fary.CRAFT.isReady(eID)){
			console.log('CRAFTING READY');
			this._processWindow.setItem(this._item, 0);
			return;
		} else {
			this._processWindow.setItem(this._item, percentage-0.05);
			this._craftingTimer = setTimeout(function() {
				this._counter -= .06;
				this.updateSceneCrafting();
			}.bind(this), 60);
		}
	}

	Scene_CraftingMenu.prototype.loseIngredients = function(item, amount){
       	var ing;
       	var db;
       	var needed;

       	item._ingredients.forEach(function(ing){
       		needed = ing['amount']*amount;
       		if ( ing['item'] != timeText && ing['item'] != 'yields' ) {
       			$gameParty.loseItem(ing['item'], needed);
       		}
       	}, this);
		this._ingredientsWindow.refresh();
	};

	/*----------------------------------------------
	* Window_InputAmount
	*---------------------------------------------*/

	function Window_InputAmount(){
		this.initialize.apply(this, arguments);
	}
	Window_InputAmount.prototype = Object.create(Window_Base.prototype);
	Window_InputAmount.prototype.constructor = Window_InputAmount;

	Window_InputAmount.prototype.initialize = function(x, y, width, height){
		Window_Base.prototype.initialize.call(this, x, y, width, height);
		this._active = false;
		this._handlers = {};
		this.createButts();
		this.deactivate();
	};

	Window_InputAmount.prototype.start = function(item, duration, yields, duraChange, max) {
		console.log('WHAT');
		this._active = true;
		this._duration = duration;
		this._duraChange = duraChange;
		this._max = max;
		this._number = 1;
		this._yields = yields;
		this.placeButts();
		this.showButtons();
		this.updateNumber();
		this.activate();
		this.show();
	};

	Window_InputAmount.prototype.update = function() {
		Window_Base.prototype.update.call(this);
		if(this._active){
			if (Input.isPressed('cancel')) {
				SoundManager.playCancel();
				this._ingredientsWindow.refresh(1);
				this._number = 1;
				this.hideButtons();
				this._active = false;
				this.contents.clear();
				this.callHandler('cancel');
			} else if (Input.isTriggered('ok')) {
				this.onButtonOk();
			} else if (Input.isTriggered('up')) {
				this.onButtonUp();
			} else if (Input.isTriggered('down')) {
				this.onButtonDown();
			}
		}
	};

	Window_InputAmount.prototype.setIngredientsWindow = function(ingredientsWindow) {
        this._ingredientsWindow = ingredientsWindow;
    };

    Window_InputAmount.prototype.setIndexWindow = function(indexWindow) {
    	this._indexWindow = indexWindow;
    };

	Window_InputAmount.prototype.createButts = function(){
		var bitmap = ImageManager.loadSystem('ButtonSet');
	    var buttonWidth = 48;
	    var buttonHeight = 48;
	    this._buttons = [];
	    for (var i = 0; i < 3; i++) {
	        var button = new Sprite_Button();
	        var x = buttonWidth * [1, 2, 4][i];
	        var w = buttonWidth * (i === 2 ? 2 : 1);
	        button.bitmap = bitmap;
	        button.setColdFrame(x, 0, w, buttonHeight);
	        button.setHotFrame(x, buttonHeight, w, buttonHeight);
	        button.visible = false;
	        this._buttons.push(button);
	        this.addChild(button);
	    }
	    this._buttons[0].setClickHandler(this.onButtonDown.bind(this));
    	this._buttons[1].setClickHandler(this.onButtonUp.bind(this));
    	this._buttons[2].setClickHandler(this.onButtonOk.bind(this));
	};

	Window_InputAmount.prototype.placeButts = function(){
		var x = 52;
		var y = (this.height/2)+15;
		this._buttons[0].x = x;
		this._buttons[0].y = y;
		this._buttons[1].x = x+48;
		this._buttons[1].y = y;
		this._buttons[2].x = x+96;
		this._buttons[2].y = y;
	};

	Window_InputAmount.prototype.showButtons = function() {
	    for (var i = 0; i < this._buttons.length; i++) {
	        this._buttons[i].visible = true;
	    }
	};

	Window_InputAmount.prototype.hideButtons = function() {
	    for (var i = 0; i < this._buttons.length; i++) {
	        this._buttons[i].visible = false;
	    }
	};

	Window_InputAmount.prototype.updateNumber = function() {
		this.contents.clear();
		this.drawText('Amount to craft:', 0, 0, this.contents.width, 'center');
		this.drawText(this._number+' x '+this._yields, 0, this.lineHeight(), this.contents.width, 'center');
	};

	Window_InputAmount.prototype.onButtonUp = function() {
	    this.changeDigit(true);
	};

	Window_InputAmount.prototype.onButtonDown = function() {
	    this.changeDigit(false);
	};

	Window_InputAmount.prototype.changeDigit = function(up) {
		var n = this._number;
		var max = this._max;
	    if (up) {
	    	if ( n == max ) {
	    		this._indexWindow.playBuzzerSound();
	    	}
	    	if (Input.isPressed('shift')) {
	    		n += 10;
	    	} else {
	    		n += 1;
	    	}
	    } else {
	    	if ( n == 1 ) {
	    		this._indexWindow.playBuzzerSound();
	    	}
	    	if (Input.isPressed('shift')) {
		    	n -= 10;
		    } else {
		    	n -= 1;
		    }
		}
	    if ( n > max) {
	    	n = max;
	    } else if ( n < 1 ) {
	    	n = 1;
	    } else {
	    	SoundManager.playCursor();
	    }
	    this._number = n;
		this._ingredientsWindow.refresh(this._number);
	    this.updateNumber();
	};

	Window_InputAmount.prototype.onButtonOk = function() {
		if(!this._indexWindow.itemIngredientsMet(this._number)){
			console.log('NOT ENOUGH MATERIALS');
			this._indexWindow.playBuzzerSound();
			return;
		} else {
			this._indexWindow.playOkSound();
			this._ingredientsWindow.refresh(1);
			this._active = false;
			this.hideButtons();
			this.contents.clear();
			this.callHandler('ok');
		}
	};

	Window_InputAmount.prototype.callHandler = function(symbol) {
	    if (this.isHandled(symbol)) {
	        this._handlers[symbol]();
	    }
	};

	Window_InputAmount.prototype.isHandled = function(symbol) {
	    return !!this._handlers[symbol];
	};

	Window_InputAmount.prototype.setHandler = function(symbol, method) {
	    this._handlers[symbol] = method;
	};

	Window_InputAmount.prototype.getAmount = function() {
		return this._number;
	};

	Window_InputAmount.prototype.getDuration = function() {
		console.log(this._duration);
		console.log(this._number);
		console.log(this._duraChange);
		return ((this._duration * this._number) + (this._duraChange*this._number));
	};

	
	/*----------------------------------------------
	* Window_CraftingCategory
	*---------------------------------------------*/
	function Window_CraftingCategory(){
		this.initialize.apply(this, arguments);
	}

	Window_CraftingCategory.prototype = Object.create(Window_Base.prototype);
	Window_CraftingCategory.prototype.constructor = Window_CraftingCategory;

	Window_CraftingCategory.prototype.initialize = function(catname, max, speed) {
		this._catname = catname;
		this._max = max;
		this._speed = speed;
		Window_Base.prototype.initialize.call(this, 0,0,Graphics.boxWidth, this.fittingHeight(2));
		this.refresh();
	};

	Window_CraftingCategory.prototype.refresh = function(){
		var mod;
		var center = (this.width/2)-40;
		if ( this._speed > 100 ){
			this.changeTextColor(this.textColor(3));
			mod = '+';
		} else {
			this.changeTextColor(this.textColor(24));
			mod = '-';
		}
		this.drawText('[Speed: '+mod+this._speed+'%]', center, this.lineHeight(), this.contents.width, this.lineHeight());
		this.resetTextColor();
		this.drawText('[Max: '+this._max+' Items]', center-this.textWidth('[Max: '+this._max+' Items]'), this.lineHeight(), this.contents.width, this.lineHeight());
		this.drawText(this._catname, center-(this.textWidth(this._catname)/2),-5,this.contents.width, this.lineHeight());
	};
	
	/*----------------------------------------------
	* Window_CraftingItems
	*---------------------------------------------*/
	function Window_CraftingItems(){
		this.initialize.apply(this, arguments);
	}
	
	Window_CraftingItems.prototype = Object.create(Window_Selectable.prototype);
	Window_CraftingItems.prototype.constructor = Window_CraftingItems;
	
	Window_CraftingItems.lastTopRow = 0;
    Window_CraftingItems.lastIndex  = 0;
	
	Window_CraftingItems.prototype.initialize = function(x,y,w,h, category) {
		this._category = parseInt(category);
		Window_Selectable.prototype.initialize.call(this, x,y,w, h);
		this.refresh();
		this.setTopRow(Window_CraftingItems.lastTopRow);
        this.select(Window_CraftingItems.lastIndex);
        this.activate();
	};
	
	Window_CraftingItems.prototype.maxCols = function(){
		return 1;
	};
	
	Window_CraftingItems.prototype.maxItems = function(){
		return this._list ? this._list.length : 0;
	};
	
	Window_CraftingItems.prototype.setStatusWindow = function(statusWindow) {
        this._statusWindow = statusWindow;
        this.updateStatus();
    };
	
	Window_CraftingItems.prototype.setIngredientsWindow = function(ingredientsWindow) {
        this._ingredientsWindow = ingredientsWindow;
        this.updateIngredients();
        this.refresh();
    };
	
	Window_CraftingItems.prototype.update = function(){
		if (!$gameMessage.isBusy()){
			Window_Selectable.prototype.update.call(this);
			this.updateStatus();
			this.updateIngredients();
		}
	};

	Window_CraftingItems.prototype.updateStatus = function() {
        if (this._statusWindow) {
            var item = this._list[this.index()];
            this._statusWindow.setItem(item);
        }
    };

    Window_CraftingItems.prototype.updateIngredients = function() {
        if (this._ingredientsWindow) {
            var item = this._list[this.index()];
            this._ingredientsWindow.setItem(item);
        }
    };
	
	Window_CraftingItems.prototype.refresh = function(){

		var i, item;
		var cat, c2;
		this._list = [];
		cat = parseInt(this._category);

		$dataItems.forEach(function(item){
			if (item == null) {return;}
			//console.log(item);
			if (item._recipe_book != null){
				item._recipe_book.recipes.forEach(function(rec_item){
					this._list.push(rec_item);
				},this);
			}
		}, this);
		
		this.createContents();
		this.drawAllItems();
	};

	
	Window_CraftingItems.prototype.drawItem = function(index){
		var item = this._list[index];
		var rect = this.itemRect(index);
		var width = rect.width - this.textPadding();
		var met = true;
		item._ingredients.forEach(function(ing){
			needed = ing['amount'];
			if( ing['item'] != timeText && ing['item'] != 'yields' ) {
				have = $gameParty.numItems(ing['item']);
				if( have < needed ){
					met = false;
				}
			}
		}, this);
		if(this._ingredientsWindow) {
			if( met == false ) {
				console.log(met);
				this.changeTextColor(this.textColor(8));
			}
			this.drawItemsName(item, rect.x, rect.y, width);
			console.log('drawItem');
			console.log(item);
			this.resetTextColor();
		}
	};

	Window_CraftingItems.prototype.drawItemsName = function(item, x, y, width) {
	    width = width || 312;
	    if (item) {
	        var iconBoxWidth = Window_Base._iconWidth + 4;
	        this.drawIcon(item.iconIndex, x + 2, y + 2);
	        this.drawText(item.name, x + iconBoxWidth, y, width - iconBoxWidth);
	    }
	};

	
	Window_CraftingItems.prototype.processCancel = function(){
		Window_Selectable.prototype.processCancel.call(this);
		Window_CraftingItems.lastTopRow = this.topRow();
        Window_CraftingItems.lastIndex = this.index();
	};

	Window_CraftingItems.prototype.processOk = function() {
		this.deactivate();
	    this.updateInputData();
	    this.callOkHandler();
	};

	Window_CraftingItems.prototype.item = function() {
    	var index = this.index();
    	return this._list && index >= 0 ? this._list[index] : null;
 
    };
	
	Window_CraftingItems.prototype.itemIngredientsMet = function(amount){
		var item = this.item();
		var met = true;
		var craftcount;
		if (item == null) return false;
		console.log(item);
    	if ( amount > 1 ) {
    		craftcount = amount;
    	} else {
    		craftcount = 1;
    	}

		var existingCount = 0, needed = 0;
		item._ingredients.forEach(function(ing){
			needed = ing['amount']*craftcount;
			if ( ing['item'] != timeText && ing['item'] != 'yields') {
       			existingCount = $gameParty.numItems(ing['item']);
				
				if (existingCount < needed){
					met = false;
				}
				console.log('have: ' + existingCount + '; need: ' + needed + '; RESULT: ' + met);
	       	}
		}, this);
		return met;
	};

	/*----------------------------------------------
	* Window_CraftingItemStatus
	*---------------------------------------------*/
	function Window_CraftingItemStatus() {
        this.initialize.apply(this, arguments);
    }

    Window_CraftingItemStatus.prototype = Object.create(Window_Base.prototype);
    Window_CraftingItemStatus.prototype.constructor = Window_CraftingItemStatus;

    Window_CraftingItemStatus.prototype.initialize = function(x, y, width) {
        Window_Base.prototype.initialize.call(this, x, y, width, this.fittingHeight(6));
    };

    Window_CraftingItemStatus.prototype.setItem = function(item) {
        if (this._item !== item) {
            this._item = item;
            this.refresh();
        }
    };

    Window_CraftingItemStatus.prototype.refresh = function() {
    	var item = this._item;
        var x = 0;
        var y = 0;
        var lineHeight = this.lineHeight();
        var width = this.contents.width - this.textPadding() * 2;

        this.contents.clear();

        if (item == null){
        	return;
        }

        this.drawItemName(item, x, y);

        x = this.textPadding();
        y = lineHeight + this.textPadding();

        //y += lineHeight;

        if (DataManager.isWeapon(item) || DataManager.isArmor(item)) {
            var etype = $dataSystem.equipTypes[item.etypeId];
            this.changeTextColor(this.systemColor());
            this.drawText(equipText, x, y, 120);
            this.resetTextColor();
            this.drawText(etype, x + 120, y, 120, 'right');
            y += lineHeight;

            var type;
            if (DataManager.isWeapon(item)) {
                type = $dataSystem.weaponTypes[item.wtypeId];
            } else {
                type = $dataSystem.armorTypes[item.atypeId];
            }
            this.changeTextColor(this.systemColor());
            this.drawText(typeText, x, y, 120);
            this.resetTextColor();
            this.drawText(type, x + 120, y, 120, 'right');

            x = this.textPadding() + 300;
            y = lineHeight + this.textPadding();
            for (var i = 2; i < 6; i++) {
                this.changeTextColor(this.systemColor());
                this.drawText(TextManager.param(i), x, y, 160);
                this.resetTextColor();
                this.drawText(item.params[i], 0, y, width, 'right');
                y += lineHeight;
            }
        }
    };



    /*----------------------------------------------
	* Window_CraftingIngredients
	*---------------------------------------------*/
	function Window_CraftingIngredients() {
        this.initialize.apply(this, arguments);
    }

    Window_CraftingIngredients.prototype = Object.create(Window_Base.prototype);
    Window_CraftingIngredients.prototype.constructor = Window_CraftingIngredients;

    Window_CraftingIngredients.prototype.initialize = function(x,y,width, height, speed){
    	Window_Base.prototype.initialize.call(this, x,y,width, height);
    	this._speed = speed; 
    }

    Window_CraftingIngredients.prototype.setItem = function(item) {
        if (this._item !== item) {
            this._item = item;
            this.refresh(1);
        }
    };

    Window_CraftingIngredients.prototype.refresh = function(amount){
    	this.contents.clear();
    	var x=0;
    	var y=0;
    	var craftcount = 1;
    	var lineHeight = this.lineHeight();
    	var width = this.contents.width - this.textPadding() * 2;
    	if ( amount > 1 && amount != null) {
    		craftcount = amount;
    	}
    	console.log('craftcount');
    	console.log(craftcount);


    	var existingCount = 0, needed = 0;
    	this.changeTextColor(this.systemColor());
		this.drawText(ingredientsText, x, y, width);
		this.resetTextColor();
		this._item._ingredients.forEach(function(ing){
			y += lineHeight;
			needed = ing['amount']*craftcount;
			
			if (ing['item'] == timeText) {
				y += lineHeight;
				existingCount = 99999;
				realDuration = needed;
				duraChange = parseInt((realDuration*(100-this._speed))/100);
				this.drawText(ing['item'], x, y, width);
				if ( duraChange == 0 ) {
					this.drawText(' ' + needed + ' Seconds', x, y, width, 'right');
				} else {
					this.drawText(' Seconds', x, y, width, 'right');
					if ( duraChange > 0 ) {
						this.changeTextColor(this.textColor(3));
					} else {
						this.changeTextColor(this.textColor(24));
					}
					this.drawText('('+duraChange+')', x, y, width-this.textWidth(' Seconds'), 'right');
					this.resetTextColor();
					this.drawText(realDuration, x, y, width-this.textWidth('('+duraChange+') Seconds'), 'right');
				}
				
			} else if (ing['item'] != 'yields') {
				existingCount = $gameParty.numItems(ing['item']);
				console.log(ing['item']);
				this.drawItemName(ing['item'], x, y, width);
				this.drawText('/' + needed, x, y, width, 'right');
				if (existingCount < needed) {
					this.changeTextColor(this.crisisColor());
				}
				else {
					this.changeTextColor(this.powerUpColor());
				}
				this.drawText(existingCount, x, y, width-this.textWidth('/' + needed), 'right');
				this.resetTextColor();
			} else {
				this.drawText('Amount produced:', x, y, width);
				this.drawText(needed, x, y, width, 'right');
			}
		}, this);
    }

    /*----------------------------------------------
	* Window_Process
	*---------------------------------------------*/
	function Window_Process() {
		this.initialize.apply(this, arguments);
	}

	Window_Process.prototype = Object.create(Window_Base.prototype);
	Window_Process.prototype.constructor = Window_Process;

	Window_Process.prototype.initialize = function(x, y, width, height) {
		Window_Base.prototype.initialize.call(this, x, y, width, height);
	};

	Window_Process.prototype.setItem = function(item, percentage) {
		this.contents.clear();
		var amount = Fary.CRAFT.getItemAmount(eID) * Fary.CRAFT.getYields(eID);

		this.drawText('Processing', 0, 0, this.contents.width);
		this.drawText(amount+'x ', 0, 40, this.contents.width);
		this.drawItemName(item, this.textWidth(amount+'x '), 40, this.contents.width);
		if( percentage > 0 ) {
		  this.drawGauge(0, 70, this.contents.width, percentage,
		    this.hpGaugeColor1(), this.hpGaugeColor2()
		  );
		} else {
			this.changeTextColor(this.powerUpColor());
			this.drawText('Crafting Complete', 0, 70, this.contents.width,'center');
			this.resetTextColor();
		}
	};

	Window_Process.prototype.clear = function() {
		this.contents.clear();
	};

    /*----------------------------------------------
	* Window_CraftingAnimation
	*---------------------------------------------*/
	/*function Window_CraftingAnimation(){
		this.initialize.apply(this, arguments);
	}

	Window_CraftingAnimation.prototype = Object.create(Window_Base.prototype);
	Window_CraftingAnimation.prototype.constructor = Window_CraftingAnimation;

	Window_CraftingAnimation.prototype.initialize = function(cat_id){
		Window_Base.prototype.initialize.call(this, 0,0,Graphics.width, Graphics.height);
		this._category = cat_id;
		this._animation = $dataAnimations[animations[cat_id]];
		this._finishedAnimation = false;
	};*/

	


	/*----------------------------------------------
	* Game System
	*---------------------------------------------*/

	Fary.CRAFT.Game_System_initialize = Game_System.prototype.initialize;
	Game_System.prototype.initialize = function() {
		Fary.CRAFT.Game_System_initialize.call(this);
		this._manufacturer = {};
		console.log('Game_System initialized');
	};

})();

/*----------------------------------------------
* Game Craft
*---------------------------------------------*/

function Game_Craft() {
	this.initialize.apply(this, arguments);
}

Game_Craft.prototype.initialize = function(eventId){
	this._eventId = eventId;
	this.resetCraft();
};

Game_Craft.prototype.event = function(eventId) {
	return $gameMap.events(this._eventId);
};

Game_Craft.prototype.resetCraft = function() {
	this._startTime = 0;
	this._endTime = 0;
	console.log('Your _endTime has been resetted!');
	this._manufactures = null;
};

Game_Craft.prototype.progress = function() {
	if (this._manufactures) {
		var full = this._manufactures.duration;
		var isAt = this._endTime - $gameSystem.playtime();

		return Math.max(isAt / full, 0);
	} else {
		return 0;
	}
};

Game_Craft.prototype.getItem = function() {
	if (this._manufactures) {
		var itemId = this._manufactures.itemId;
		var type = this._manufactures.itemType;
		var item;
		switch (type) {
			case 'item': item = $dataItems[itemId]; break;
			case 'weapon': item = $dataWeapons[itemId]; break;
			case 'armor': item = $dataArmors[itemId]; break;
		}
		return item;
	}
};

Game_Craft.prototype.checkTime = function() {
	if (this._manufactures) {
		var isAt = this._endTime - $gameSystem.playtime();
		console.log('CHECKTIME:'+isAt);
		return isAt;
	} else {
		return 0;
	}
};

Game_Craft.prototype.getManDuration = function() {
	if (this._manufactures) {
		return this._manufactures.duration;
	} else {
		return 0;
	}
};

Game_Craft.prototype.getItemAmount = function() {
	if (this._manufactures) {
		return this._manufactures.amount;
	} else {
		return 0;
	}
};

Game_Craft.prototype.isReady = function() {
	console.log(this.progress());
	return this.progress() <= 0;
};

Game_Craft.prototype.startCraft = function(iId, type, dura, amt) {
	this._manufactures = {
		duration: dura,
		itemId: iId,
		itemType: type,
		amount: amt
	}

	this._startTime = $gameSystem.playtime();
	var a = this._startTime;
	var b = this._manufactures.duration;
	var c = this._startTime + this._manufactures.duration;
	console.log(a+'+'+b+'='+c)
	this._endTime = c;
	console.log('Endtime = '+this._endTime);
	console.log(this._manufactures);
};

/*----------------------------------------------
* Scene Load
*---------------------------------------------*/

Fary.CRAFT.Scene_Load_onLoadSuccess = Scene_Load.prototype.onLoadSuccess;
Scene_Load.prototype.onLoadSuccess = function() {
	Fary.CRAFT.reSetupCraftEvents = true;
	Fary.CRAFT.Scene_Load_onLoadSuccess.call(this);
	console.log('Scene Loaded');
};

/*----------------------------------------------
* Scene Map
*---------------------------------------------*/

Fary.CRAFT.Scene_Map_Start = Scene_Map.prototype.start;
Scene_Map.prototype.start = function() {
	Fary.CRAFT.Scene_Map_Start.call(this);
	this.setupCraftEvents();
	console.log('Scene_Map initialized');
};

Scene_Map.prototype.setupCraftEvents = function() {
	if (Fary.CRAFT.reSetupCraftEvents) {
		var events = $gameMap.events();
		for (var e in events) {
			events[e].setupCraftEvent($gameMap._mapId,e._eventId);
		}
	}
	Fary.CRAFT.reSetupCraftEvents = false;
}

/*----------------------------------------------
* Game Event
*---------------------------------------------*/

Fary.CRAFT.Game_Event_initialize = Game_Event.prototype.initialize;
Game_Event.prototype.initialize = function(mapId, eventId) {
	Fary.CRAFT.Game_Event_initialize.call(this,mapId,eventId);
	this.setupCraftEvent(mapId,eventId);
	console.log('Game_Event initialized');
};

Game_Event.prototype.setupCraftEvent = function(mapId,eventId) {
	var e = this.event().note.match(/<manufacturer(.*)>/i);
	if (e) {
		var type = e[1];
		this._isMan = true;
		$gameSystem._manufacturer[mapId][eventId] = $gameSystem._manufacturer[mapId][eventId] || new Game_Craft(eventId);
		this.updatePattern = function() {};
		this.updateProgress();
	}
	
};

Game_Event.prototype.manufacture = function() {
	return $gameSystem._manufacturer[this._mapId][this._eventId];
};

Game_Event.prototype.updateManufacture = function() {
	this.updateProgress();
	this.resetStopCount();
};

Game_Event.prototype.updateProgress = function() {
	var craft = this.manufacture();
	if (!craft) return;

	var rate = craft.progress();
};

Game_Event.prototype.startCraft = function(id, type, duration, amount) {
	this.manufacture().startCraft(id, type, duration, amount);
	this.updateProgress();
};

/*----------------------------------------------
* Game Map
*---------------------------------------------*/

Fary.CRAFT.Game_Map_setup = Game_Map.prototype.setup;
Game_Map.prototype.setup = function(mapId) {
	$gameSystem._manufacturer[mapId] = $gameSystem._manufacturer[mapId] || {};
	Fary.CRAFT.Game_Map_setup.call(this,mapId);
};