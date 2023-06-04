const game = Game.getInstance(),
    player = game.player,
    Console = game.console;

game.generateRandomObjects();
player.inventory.appendItem(Guns["AKM"]);
player.inventory.appendItem(Guns["M37"]);
player.inventory.appendItem(Guns["AWP"]);
player.inventory.appendItem(Guns["DEagle"]);
player.inventory.appendItem(Guns["M16A4"]);