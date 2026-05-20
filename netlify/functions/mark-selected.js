const { Octokit } = require("@octokit/rest");

exports.handler = async function(event){
  if(event.httpMethod !== "POST"){
    return {statusCode:405, body:JSON.stringify({error:"Method not allowed"})};
  }

  try{
    const { id, code } = JSON.parse(event.body || "{}");

    if(!id){
      return {statusCode:400, body:JSON.stringify({error:"Movie id is required."})};
    }

    if(code !== process.env.MOVIE_HOLE_ADMIN_CODE){
      return {statusCode:401, body:JSON.stringify({error:"Incorrect admin code."})};
    }

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const token = process.env.GITHUB_TOKEN;
    const path = process.env.MOVIES_PATH || "data/movies.json";

    if(!owner || !repo || !token){
      return {statusCode:500, body:JSON.stringify({error:"GitHub environment variables are not configured."})};
    }

    const octokit = new Octokit({auth:token});
    const current = await octokit.repos.getContent({owner, repo, path, ref:branch});

    const content = Buffer.from(current.data.content, "base64").toString("utf8");
    const movies = JSON.parse(content);

    const movie = movies.find(item => item.id === id);
    if(!movie){
      return {statusCode:404, body:JSON.stringify({error:"Movie not found."})};
    }

    movie.selected = true;
    movie.selectedAt = new Date().toISOString();

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      branch,
      sha: current.data.sha,
      message: `Mark selected: ${movie.title}`,
      content: Buffer.from(JSON.stringify(movies, null, 2)).toString("base64")
    });

    return {statusCode:200, body:JSON.stringify({movie})};
  }catch(error){
    return {statusCode:500, body:JSON.stringify({error:error.message})};
  }
};