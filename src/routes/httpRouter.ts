import { Router as ExpressRouter } from 'express';
import { E_RequestType, I_REQUEST_StatusResponse, E_HTTPRoutes } from './meta';
import { Supabase } from '../server/modules/supabase/supabase';

// Create a router instance
const router = ExpressRouter();

router.get(E_RequestType.STATUS, async (req, res) => {
    const routes = await Supabase.getInstance(false).getRoutes();

    const response: I_REQUEST_StatusResponse = {
        REALTIME_API_URL: routes[E_HTTPRoutes.REALTIME],
        S3_STORAGE_URL: routes[E_HTTPRoutes.STORAGE],
    };

    res.json(response);
});

export namespace HTTPTransport {
    export const Routes = router;
}
