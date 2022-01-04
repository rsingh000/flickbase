const express = require('express');
let router = express.Router();
require('dotenv').config();
const { checkLoggedIn } = require('../../middlewares/auth');
const { grantAccess } = require('../../middlewares/roles');
const  { contactMail, registerEmail} = require('../../config/email');


const { User } = require('../../models/user_model');

router.route('/register')
.post( async (req,res)=>{
    try {

        if( await User.emailTaken(req.body.email)){
            return res.status(400).json({message: 'Email already in use'});
        }

        const user = new User({
            email: req.body.email,
            password: req.body.password
        });

        const token = user.generateToken();
        const doc = await user.save();

        const emailToken = user.generateRegisterToken();
        await registerEmail(doc.email,emailToken);

        res.cookie('x-access-token',token).status(200).send(getUserProps(doc))
    } catch(err){
        res.status(400).json({message:'Error', error: err})
    }
})

router.route('/signin')
.post( async(req,res)=>{
    try {
        let user = await User.findOne({email:req.body.email});
        if(!user) return res.status(400).json({message: 'Incorrect email'});
        
        const compare = await user.comparePassword(req.body.password);
        if(!compare) return res.status(400).json({message:'Incorrect Password'});

        const token = user.generateToken();

        res.cookie('x-access-token', token)
        .status(200).send(getUserProps(user));
    
    } catch(err){
        res.status(400).json({message:'Error', error: err})
    }
})

router.route('/profile')
.get(checkLoggedIn,grantAccess('readOwn','profile'), async (req,res)=>{

    try{
        const permission = res.locals.permission;
        const user = await User.findById(req.user._id);
        if(!user) return res.status(400).json({message:'User not found'});

        return res.status(200).json(permission.filter(user._doc));
        } catch(err){
        return res.status(400).send(err);
    }

    console.log(req.user)
    res.status(200).send('ok');
})
.patch(checkLoggedIn,grantAccess('updateOwn','profile'),async (req,res)=>{
    try{
        const user = await User.findOneAndUpdate(
            {_id: req.user._id},
            {
                "$set":{
                    firstname: req.body.firstname,
                    lastname: req.body.lastname,
                    age: req.body.age
                }
            },
            { new: true }
        );
        if(!user) return res.status(400).json({message:'User not found'})

        res.status(200).json(getUserProps(user))
    }catch(err){
        res.status(400).json({message:"Problem updating",error:error});
    }
})

router.route("/update_email")
.patch(checkLoggedIn, grantAccess('updateOwn','profile'),async (req,res)=>{
    try{
        /// make 
        console.log(req.body.newemail)

        if(await User.emailTaken(req.body.newemail)){
            return res.status(400).json({message:"Sorry email taken"})
        }

        const user = await User.findOneAndUpdate(
            {_id: req.user._id, email: req.body.email },
            {
                "$set":{
                    email: req.body.newemail
                }
            },
            {new:true}
        );
        if(!user) return res.status(400).json({message:'User not found'})

        const token = user.generateToken();
        res.cookie('x-access-token',token)
        .status(200).send({email:user.email})
    } catch(error){
        res.status(400).json({message:"Problem updating",error:error});
    }
})


router.route('/isauth')
.get(checkLoggedIn, async (req,res)=>{
    res.status(200).send(getUserProps(req.user))
})

router.route('/contact')
.post(async(req,res)=>{
    try{
        await contactMail(req.body)
        res.status(200).send('ok');
    } catch(error){
        res.status(400).json({message:"Sorry, try again later",error:error});
    }
})

router.route('/verify')
.get( async(req,res)=>{
    try{
        const token = User.validateToken(req.query.validation);
        const user = await User.findById(token._id);
        if(!user) return res.status(400).json({ message: 'User not found!!!'});
        if(user.verified) return res.status(400).json({messgae:'Already verified!!!'});

        user.verified = true;

        await user.save();
        res.status(200).send(getUserProps(user));
    } catch(error){
        res.status(400).send(error)
    }
})

const getUserProps = (user) => {
    return {
        _id: user._id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        age: user.age,
        role: user.role,
        verified:user.verified
    }
}

module.exports = router;