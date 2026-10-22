import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
    },
    coins: {
      type: Number,
      default: 100,
      min: [0, 'Coins balance cannot be negative'],
    },
    gems: {
      type: Number,
      default: 0,
      min: [0, 'Gems balance cannot be negative'],
    },
    tickets: {
      type: Number,
      default: 5,
      min: [0, 'Tickets balance cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

const Wallet = mongoose.model('Wallet', walletSchema);

export default Wallet;
