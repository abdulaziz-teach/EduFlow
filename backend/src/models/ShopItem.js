import mongoose from 'mongoose';

const shopItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      enum: ['avatar_frame', 'badge', 'theme', 'streak_freeze', 'hint_pack', 'custom'],
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      enum: ['coins', 'gems', 'tickets'],
      default: 'coins',
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    stock: {
      type: Number,
      default: -1, // -1 means unlimited stock
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

shopItemSchema.index({ active: 1, type: 1 });

const ShopItem = mongoose.model('ShopItem', shopItemSchema);

export default ShopItem;
