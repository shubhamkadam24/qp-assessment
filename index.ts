// Import necessary modules and dependencies
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { Sequelize, DataTypes, Model } from 'sequelize';

const app = express();
const port = 3000;

// Connect to MySQL database
const sequelize = new Sequelize('grocery', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
});

// Define GroceryItem model
class GroceryItem extends Model {}
GroceryItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    inventory: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'grocery_item',
  }
);

// Define Order model
class Order extends Model {}
Order.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
  },
  {
    sequelize,
    modelName: 'order',
  }
);

// Define OrderItem model
class OrderItem extends Model {}
OrderItem.init(
  {
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    groceryItemId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'grocery_items', // 'grocery_items' refers to table name
        key: 'id',
      },
      allowNull: false,
    },
    orderId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'orders', // 'orders' refers to table name
        key: 'id',
      },
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'order_item',
  }
);

// Define associations
Order.hasMany(OrderItem, { as: 'items' });
OrderItem.belongsTo(Order);
OrderItem.belongsTo(GroceryItem);

// Middleware
app.use(bodyParser.json());

// Sync models with database
sequelize.sync({ force: true }).then(() => {
  console.log('Database synced');
});

// Admin Endpoints
// Add new grocery items to the system
app.post('/api/admin/grocery-items', async (req: Request, res: Response) => {
  try {
    const newItem = await GroceryItem.create(req.body);
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// View existing grocery items
app.get('/api/admin/grocery-items', async (req: Request, res: Response) => {
  try {
    const items = await GroceryItem.findAll();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Remove grocery items from the system
app.delete('/api/admin/grocery-items/:id', async (req: Request, res: Response) => {
  const itemId = parseInt(req.params.id);
  try {
    await GroceryItem.destroy({ where: { id: itemId } });
    res.json({ message: `Grocery item with id ${itemId} has been removed` });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update details of existing grocery items
app.put('/api/admin/grocery-items/:id', async (req: Request, res: Response) => {
  const itemId = parseInt(req.params.id);
  try {
    await GroceryItem.update(req.body, { where: { id: itemId } });
    res.json({ message: `Grocery item with id ${itemId} has been updated` });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Manage inventory levels of grocery items
app.put('/api/admin/grocery-items/:id/inventory', async (req: Request, res: Response) => {
  const itemId = parseInt(req.params.id);
  try {
    await GroceryItem.update({ inventory: req.body.inventory }, { where: { id: itemId } });
    res.json({ message: `Inventory for grocery item with id ${itemId} has been updated` });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User Endpoints
// View the list of available grocery items
app.get('/api/grocery-items', async (req: Request, res: Response) => {
  try {
    const items = await GroceryItem.findAll();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Ability to book multiple grocery items in a single order
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const newOrder = await Order.create();
    const orderItems = await Promise.all(req.body.items.map(async (item: any) => {
      // Find the grocery item by name
      const groceryItem = await GroceryItem.findOne({ where: { name: item.name } });
      if (!groceryItem) {
        throw new Error(`Grocery item with name ${item.name} not found`);
      }
      // Return the order item with the grocery item ID and quantity
      return {
        groceryItemId: groceryItem.getDataValue('id'),
        quantity: item.quantity,
        orderId: newOrder.getDataValue('id'),
      };
    }));
    const createdOrderItems = await OrderItem.bulkCreate(orderItems);
    res.status(201).json({ orderId: newOrder.getDataValue('id'), items: createdOrderItems });
  } catch (error) {
    res.status(500).json('Internal Server Error');
  }
});



// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
