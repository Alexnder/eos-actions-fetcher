import axios from 'axios';
import mongoose from 'mongoose';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/eosdb';

async function connectToMongo() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}

type EosAction = {
  trx_id: string;
  block_time: string;
  block_num: number;
}

const actionSchema = new mongoose.Schema({
  trx_id: { type: String, unique: true },
  block_time: String,
  block_num: Number,
});

const Action = mongoose.model('Action', actionSchema);

async function saveActions() {
  try {
    const response = await axios.post('https://eos.greymass.com/v1/history/get_actions', {
      account_name: 'eosio',
      pos: -1,
      offset: -100,
    });

    console.log('response', response.data.actions)
    
    const actions = response.data.actions;

    for (const action of actions) {
      const { trx_id, block_time, block_num } = action.action_trace as EosAction;

      const existingAction = await Action.findOne({ trx_id });
      if (!existingAction) {
        const newAction = new Action({ trx_id, block_time, block_num });
        await newAction.save();
        console.log(`Saved action with trx_id: ${trx_id}`);
      } else {
        console.log(`Action with trx_id: ${trx_id} already exists`);
      }
    }
  } catch (error) {
    console.error('Error during saving actions:', error);
  }
}

async function main() {
  await connectToMongo();

  cron.schedule('* * * * *', async () => {
    console.log('Fetching actions...');
    await saveActions();
  });
}

main().catch((error) => console.error('Error in main execution:', error));