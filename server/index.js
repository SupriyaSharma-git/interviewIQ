import express from "express"
import dotenv from "dotenv";
import connectDb from "./config/connectDb.js";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.route.js";
dotenv.config();
import cors from "cors"
import userRouter from "./routes/user.route.js";
import interviewRouter from "./routes/interview.route.js";
import paymentRouter from "./routes/payment.route.js";


const app = express();

app.use(cors({
    origin: "https://interviewiq-1client-ez06.onrender.com",
    credentials: true,
}));

app.use(express.json())
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/interview", interviewRouter);
app.use("/api/payment", paymentRouter);

const PORT = process.env.PORT || 6000

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`)
    connectDb();
})

