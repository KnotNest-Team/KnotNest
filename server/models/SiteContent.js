import mongoose from 'mongoose';

const { Schema } = mongoose;
const story = new Schema({ slug: String, couple: String, city: String, date: String, style: String, image: String, tag: String, description: String }, { _id: false });
const testimonial = new Schema({ couple: String, city: String, date: String, rating: { type: Number, default: 5 }, quote: String, photo: String }, { _id: false });
const experience = new Schema({ title: String, desc: String, image: String, tag: String, videoUrl: String }, { _id: false });
const offer = new Schema({ title: String, description: String, code: String, validTill: String, image: String }, { _id: false });
const banner = new Schema({ title: String, subtitle: String, image: String, link: String, active: { type: Boolean, default: true } }, { _id: false });

/** Singleton document (key = 'home') that powers every admin-editable part of the landing page. */
const siteContentSchema = new Schema({
  key: { type: String, default: 'home', unique: true },
  hero: {
    storyLabel: { couple: String, city: String, date: String },
    titleLines: [String],
    subtitle: String,
    image: String,
    videoUrl: String,
    stats: [{ _id: false, value: String, label: String }],
  },
  trust: [{ _id: false, label: String, to: Number, suffix: String, decimals: { type: Number, default: 0 } }],
  google: { rating: Number, count: Number, visible: { type: Boolean, default: true } },
  stories: [story],
  testimonials: [testimonial],
  experiences: [experience],
  offers: [offer],
  banners: [banner],
  featuredVendors: [{ type: Schema.Types.ObjectId, ref: 'Vendor' }],
}, { timestamps: true });

export default mongoose.model('SiteContent', siteContentSchema);
