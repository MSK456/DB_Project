import mongoose, {Schema} from "mongoose";

const videoSchema = new Schema(
    {
        videoFile: {
            type: String,  // caludinary URL
            required: true
        },
        thumbnail: {
            type: String,  // caludinary URL
            required: true
        },
        title: {
            type: String,
            required: true
        },
        discription: {
            type: String,
            required: true
        },
        duration: {
            type: Number,  // From caludinary
            required: true
        },
        views: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
        

    },
    {
        timestamps: true
    }
)

export const Video = mongoose.model("Video", videoSchema)