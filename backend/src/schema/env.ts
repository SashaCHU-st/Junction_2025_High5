import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

function requireEnv(key:string):string{
    const value = process.env[key];
    if (!value || value.trim() === '')
    {
        console.error(`Missing or empty required enviroment variable : ${key}`);
        process.exit(1); // this one should prodect in the main 
    }
    return value;
}

// const dbUrlSchema = z.string().url().refine(
//     (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
//     {
//         message: 'DB_URL must be a valid PostgreSQL connection string',
//     }
// )

// const dbUrlResult = dbUrlSchema.safeParse(requireEnv('DB_URL'));
// if (!dbUrlResult.success){
//     console.error(`Invalid DB_URL : ${dbUrlResult.error.errors[0].message}`)
//     process.exit(1);
// }

const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: requireEnv('PORT'),
    // DB_URL: dbUrlResult.data,
    DB_URL: requireEnv('DB_URL'),
} as const;

export const PORT = env.PORT;
export const NODE_ENV = env.NODE_ENV;

export const getEnvConfig = () => (env.DB_URL);
