// interface Field {
//     name: string;
//     value: string;
//     inline:boolean;
// }

// interface EmbedData {
//     author?: string;
//     title?: string;
//     description?: string;
//     color?: string;
//     footer?: string;
//     footerIcon?: string;
//     timestamp?: boolean;
//     image?: string;
//     thumbnail?: string;
//     fields?: Field[];
// }
const mongoose = require('mongoose');
const embedDataSchema = new mongoose.Schema(({
    // author: { type: String, required: false },
    title: { type: String, required: false },
    description: { type: String, required: false },
    color: { type: String, required: false },
    footer: { type: String, required: false },
    footerIcon: { type: String, required: false },
    timestamp: { type: Boolean, required: false, default: false },
    image: { type: String, required: false },
    thumbnail: {type:String,required:false},
    fields: {
        type: [
            {
                name: { type: String },
                value: { type: String },
                inline: { type: Boolean }
            }
        ],
        required: false
    }
}));
module.exports = mongoose.model('EmbedData', embedDataSchema);