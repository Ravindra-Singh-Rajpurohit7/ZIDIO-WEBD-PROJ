import mongoose from 'mongoose';

const summarySchema = new mongoose.Schema({
  meeting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: true,
  },
  transcript: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  actionItems: [{
    type: String,
  }],
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

const Summary = mongoose.model('Summary', summarySchema);
export default Summary;
