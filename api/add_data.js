// BY POLOSS

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res){

    res.setHeader("Content-Type", "application/json");

    try{

        if(req.method !== "POST"){

            return res.status(405).json({
                status:false,
                message:"Method not allowed"
            });

        }

        const { name } = req.body;

        if(!name){

            return res.status(400).json({
                status:false,
                message:"Name kosong"
            });

        }

        const { data, error } = await supabase
            .from("test_data")
            .insert([
                {
                    name:name
                }
            ])
            .select();

        if(error){

            return res.status(500).json({
                status:false,
                message:error.message
            });

        }

        return res.status(200).json({
            status:true,
            data:data
        });

    }catch(err){

        return res.status(500).json({
            status:false,
            message:err.message
        });

    }

}
