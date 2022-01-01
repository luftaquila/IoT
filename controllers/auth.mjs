import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config();

const users = Object.entries(process.env).filter(x => x[0].match(/id\d+/));
const pws = Object.entries(process.env).filter(x => x[0].match(/pw\d+/));

class AuthClient {
  login(id, pw) {
    const userId = users.find(x => x[1] == id);
    if(userId) {
      let userIndex = userId[0].match(/id(\d+)/);
      if(userIndex) userIndex = userIndex[1];
      else return false;

      let matchPW = pws.find(x => x[0] == `pw${userIndex}`);
      if(matchPW) matchPW = matchPW[1];
      else return false;

      if(pw === matchPW) return jwt.sign({ id: id }, process.env.JWTsecret, { expiresIn: '365d' });
      else return false;
    }
    else return false;
  }

  verify(token) {
    let flag;
    jwt.verify(token, process.env.JWTsecret, (err, decoded) => {
      if(err) flag = false;
      else flag = decoded;
    });
    return flag;
  }
}

const Auth = new AuthClient();

export default Auth
