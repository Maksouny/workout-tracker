/* =========================================================================
   CORE — COOKING METHODS (weight multiplier raw -> cooked grams)
   ========================================================================= */
App.Core = App.Core || {};
App.Core.CookingMethods = (function(){
  const COOKING_METHODS = [
    {name:"Без обработки (сырое)", mult:1.0},
    {name:"Варка (крупы/макароны)", mult:2.7},
    {name:"Варка (мясо/рыба/яйца/овощи)", mult:0.75},
    {name:"Жарка", mult:0.75},
    {name:"Запекание/тушение", mult:0.85},
    {name:"Гриль", mult:0.7},
  ];
  const DEFAULT_INGREDIENTS = [
    {name:"Гречка (сухая)", kcal:313, protein:12.6, fat:3.3, carb:62, fiber:10, price:8},
    {name:"Рис (сухой)", kcal:344, protein:6.7, fat:0.7, carb:78, fiber:1, price:9},
    {name:"Овсянка (сухая)", kcal:342, protein:12, fat:6, carb:59, fiber:10, price:7},
    {name:"Куриная грудка (сырая)", kcal:165, protein:31, fat:3.6, carb:0, fiber:0, price:35},
    {name:"Яйцо куриное", kcal:157, protein:12.7, fat:11.5, carb:0.7, fiber:0, price:12, pieceWeight:55, pricePiece:9},
    {name:"Творог 5%", kcal:121, protein:17, fat:5, carb:3, fiber:0, price:20},
    {name:"Молоко 2.5%", kcal:52, protein:2.8, fat:2.5, carb:4.7, fiber:0, price:9},
    {name:"Картофель", kcal:77, protein:2, fat:0.4, carb:16, fiber:1.8, price:5},
    {name:"Лук репчатый", kcal:41, protein:1.4, fat:0.2, carb:8.2, fiber:1.7, price:4},
    {name:"Сосиска", kcal:266, protein:11, fat:24, carb:2, fiber:0, price:25, pieceWeight:60, pricePiece:15},
    {name:"Кетчуп", kcal:93, protein:1.6, fat:0.2, carb:20, fiber:0.5, price:15},
    {name:"Масло растительное", kcal:900, protein:0, fat:100, carb:0, fiber:0, price:12},
    {name:"Хлеб пшеничный", kcal:265, protein:8, fat:3, carb:50, fiber:2.7, price:6},
  ];
  return {COOKING_METHODS, DEFAULT_INGREDIENTS};
})();
