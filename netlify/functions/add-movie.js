const { Octokit } = require("@octokit/rest");

function normalizeTitle(title){
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

exports.handler = async function(event){
  if(event.httpMethod !== "POST"){
    return {statusCode:405, body:JSON.stringify({error:"Method not allowed"})};
  }

  try{
    const { title, submittedBy } = JSON.parse(event.body || "{}");
    const cleanTitle = String(title || "").trim();

    if(!cleanTitle){
      return {statusCode:400, body:JSON.stringify({error:"Movie title is required."})};
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

    const duplicate = movies.some(movie => normalizeTitle(movie.title) === normalizeTitle(cleanTitle));
    if(duplicate){
      return {
        statusCode:409,
        body:JSON.stringify({error:'please stop asking for movies we already have on file, you dick. Or you will be removed from this site and reported to the police'})
      };
    }

    const movie = {
      id: "m_" + Date.now(),
      title: cleanTitle,
      submittedBy: submittedBy || "",
      selected: false,
      addedAt: new Date().toISOString()
    };

    movies.unshift(movie);

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      branch,
      sha: current.data.sha,
      message: `Add movie suggestion: ${cleanTitle}`,
      content: Buffer.from(JSON.stringify(movies, null, 2)).toString("base64")
    });

    return {statusCode:200, body:JSON.stringify({movie})};
  }catch(error){
    return {statusCode:500, body:JSON.stringify({error:error.message})};
  }
};