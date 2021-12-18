const express = require('express');
let router = express.Router();
const { checkLoggedIn } = require('../../middlewares/auth');
const { grantAccess } = require('../../middlewares/roles');
const { sortArgsHelper } = require('../../config/helpers');

const { Article } = require('../../models/article_model');

router.route('/admin/add_articles')
.post(checkLoggedIn,grantAccess('createAny','article'), async (req,res)=>{
    try {

        const article = new Article({
            ...req.body,
            score:parseInt(req.body.score)
        });
        const result = await article.save();
        res.status(200).json(result)
    } catch(err){
        res.status(400).json({
            message:'Error adding article',
            error: err
        })
    }
})

router.route('/admin/:id')
.get(checkLoggedIn,grantAccess('readAny','article'),async(req,res)=>{
    try{
        const _id = req.params.id;
        const article = await Article.findById(_id);
        if(!article || article.length === 0){
            return res.status(400).json({message:'Article not found'});
        }
        res.status(200).json(article);
    } catch(err){
        res.status(400).json({message:'Error fetching article', error: err});
    }
})
.patch(checkLoggedIn,grantAccess('readAny','article'),async(req,res)=>{
    try{
        const _id = req.params.id;
        const article = await Article.findOneAndUpdate(
            {_id},
            {
                "$set": req.body
            },
            {
                new: true
            }
        );
        if(!article) return res.status(400).json({message:'Article not found'});
        
        res.status(200).json(article);
    } catch(err){
        res.status(400).json({message:'Error updating article', error: err});
    }
})
.delete(checkLoggedIn,grantAccess('readAny','article'),async(req,res)=>{
    try{
        const _id = req.params.id;
        const article = await Article.findByIdAndRemove(_id);
        if(!article) return res.status(400).json({message:'Article not found'});
        
        res.status(200).json({_id:article._id});
    } catch(err){
        res.status(400).json({message:'Error deleting article', error: err});
    }
})

router.route('/admin/paginate')
.post(checkLoggedIn,grantAccess('readAny','articles'),async (req,res)=>{
    try {
        const limit = req.body.limit ? req.body.limit : 5;
        const aggQuery = Article.aggregate();
        const options = {
            page: req.body.page,
            limit,
            sort:{_id:'desc'}
        }

        const articles = await Article.aggregatePaginate(aggQuery,options);
        res.status(200).json(articles);
    } catch(err) {
        res.status(400).json({message:'Error', error: err});
    }
})

router.route('/get_by_id/:id')
.get(async(req,res)=>{
    try {
        const _id = req.params.id;
        const article = await Article.find({_id: _id, status:'public'});
        if(!article || article.length === 0){
            return res.status(400).json({message:'Article not found'});
        }        
        console.log(req.body)
        res.status(200).json(article);
    } catch(err){
        res.status(400).json({message:'Error fetching article', error: err});
    }
})

router.route('/loadmore')
.post(async(req,res)=>{
    try {
        let sortArgs = sortArgsHelper(req.body);

        const articles = await Article
        .find({status:'public'})
        .sort([[sortArgs.sortBy,sortArgs.order]])
        .skip(sortArgs.skip)
        .limit(sortArgs.limit);

        res.status(200).json(articles)
    } catch(err){
        res.status(400).json({message:'Error fetching articles', error: err});
    }
})

module.exports = router;