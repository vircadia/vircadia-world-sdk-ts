import { Router as ExpressRouter } from 'express';
import {
    E_RequestType,
    I_REQUEST_ConfigAndStatusResponse,
    E_HTTPRoutes,
} from './meta';
import { Supabase } from '../server/modules/supabase/supabase';

// Create a router instance
const router = ExpressRouter();

router.get(E_RequestType.CONFIG_AND_STATUS, async (req, res) => {
    const routes = await Supabase.getInstance(false).getRoutes();

    const response: I_REQUEST_ConfigAndStatusResponse = {
        REALTIME_API_URL: routes[E_HTTPRoutes.REALTIME],
        S3_STORAGE_URL: routes[E_HTTPRoutes.STORAGE],
    };

    res.json(response);
});

export namespace HTTPTransport {
    export const Routes = router;
}
