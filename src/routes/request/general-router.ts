import { Router } from 'express';

// Create a router instance
const router = Router();

// Define an example route
router.get('/example', (req, res) => {
    res.json({ message: 'This is an example route.' });
});

// Export the router
export { router as Request };
