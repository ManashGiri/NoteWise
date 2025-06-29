const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const conversationSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: String,
    content: String,
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400,
    },
});

const Conversation = mongoose.model("Conversation", conversationSchema);
module.exports = Conversation;