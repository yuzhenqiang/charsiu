import { OpenAPIHono} from "@hono/zod-openapi";
import createApi from './create';
import listApi from './list'
import moveApi from './move'
import copyApi from './copy'
import deleteApi from './delete'

export const storage = new OpenAPIHono()

storage.route('/list', listApi)
storage.route('/create', createApi)
storage.route('/move', moveApi)
storage.route('/copy', copyApi)
storage.route('/delete', deleteApi)
