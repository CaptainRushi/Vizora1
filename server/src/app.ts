import express from 'express';
import cors from 'cors';
import schemaReviewRoutes from './routes/schemaReview';
import onboardingGuideRoutes from './routes/onboardingGuide';
import askSchemaRoutes from './routes/askSchema';

const app = express();

app.use(cors());
app.use(express.json());

// Intelligence Routes
app.use('/api/schema', schemaReviewRoutes);
app.use('/api/schema', onboardingGuideRoutes);
app.use('/api/schema', askSchemaRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'vizora-intelligence' });
});

export default app;
