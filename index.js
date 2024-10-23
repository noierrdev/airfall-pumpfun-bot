require("dotenv").config()

const { Connection, Keypair } = require("@solana/web3.js")
//geyser client
const Client=require("@triton-one/yellowstone-grpc");

const PUMPFUN_CONTRACT="6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
const METAPLEX_CONTRACT="metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
const connection=new Connection(process.env.RPC_API)
const bs58=require("bs58")
const { swapPumpfunFaster }=require("./swap")

const PRIVATE_KEY = Uint8Array.from(bs58.decode(process.env.PRIVATE_KEY));
const wallet = Keypair.fromSecretKey(PRIVATE_KEY);

function connectGeyser(){
    const client =new Client.default("http://grpc.solanavibestation.com:10000/",undefined,undefined);
    client.getVersion()
    .then(async version=>{
        try {
            console.log(version)
            const request =Client.SubscribeRequest.fromJSON({
                accounts: {},
                slots: {},
                transactions: {
                    pumpfun: {
                        vote: false,
                        failed: false,
                        signature: undefined,
                        accountInclude: [PUMPFUN_CONTRACT],
                        accountExclude: [],
                        accountRequired: [],
                    },
                },
                transactionsStatus: {},
                entry: {},
                blocks: {},
                blocksMeta: {},
                accountsDataSlice: [],
                ping: undefined,
                commitment: Client.CommitmentLevel.PROCESSED
            })
        
            const stream =await client.subscribe();
            stream.on("data", async (data) => {
                if(data.transaction&&data.transaction.transaction&&data.transaction.transaction.signature) {
                        const transaction=data.transaction.transaction;
                    if(transaction.meta.logMessages.some(log=>log.includes("InitializeMint2"))){
                        const sig=bs58.encode(data.transaction.transaction.signature)
                        
                        console.log(`https://solscan.io/tx/${sig}`)
                        var pumpfunProgramIndex=0;
                        var metaplexProgramIndex=0;
                        const allAccounts=[];
                        transaction.transaction.message.accountKeys.map((account,index)=>{
                            if(!account) return;
                            const accountID=bs58.encode(account);
                            allAccounts.push(accountID);
                            if(accountID==PUMPFUN_CONTRACT){
                                pumpfunProgramIndex=index;
                            }
                            if(accountID==METAPLEX_CONTRACT){
                                metaplexProgramIndex=index;
                            }
                        })
                        const pumpfunInstructions = (transaction?.transaction.message.instructions).find(instruction =>((instruction.programIdIndex==pumpfunProgramIndex)&&instruction.accounts.includes(metaplexProgramIndex)));
                        const targetToken=allAccounts[pumpfunInstructions.accounts[0]]
                        const bondingCurve=allAccounts[pumpfunInstructions.accounts[2]]
                        const bondingCurveVault=allAccounts[pumpfunInstructions.accounts[3]]
                        const signer=allAccounts[0]
                        if(signer!=wallet.publicKey.toBase58()){
                            console.log("Not your token!!!")
                            return;
                        }
                        
                        await swapPumpfunFaster(connection,targetToken,bondingCurve,bondingCurveVault,0.001,false);
                    }
                }
            });
            await new Promise((resolve, reject) => {
                stream.write(request, (err) => {
                    if (err === null || err === undefined) {
                    resolve();
                    } else {
                    reject(err);
                    }
                });
            }).catch((reason) => {
                console.error(reason);
                throw reason;
            });
        } catch (error) {
            console.log(error)
            console.log("RECONNECTING!!!")
            setTimeout(() => {
                connectGeyser()
            }, 2000);
            
        }

    });
}

connectGeyser()