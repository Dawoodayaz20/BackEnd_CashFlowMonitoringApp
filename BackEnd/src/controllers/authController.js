// const User = require('../models/User');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { OAuth2Client } = require('google-auth-library')
// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// // Register new user
// const register = async (req, res) => {
//   console.log('📥 Register request received:', req.body); // ADD THIS

//   try {
//     const { name, email, password } = req.body;
    
//     // Check if user already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: 'User already exists' });
//     }

//     // Create new user
//     const user = new User({ name, email, password });
//     await user.save(); // Password gets hashed automatically here

//     // Generate JWT
//     const token = jwt.sign(
//       { userId: user._id }, 
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRE }
//     );

//     // Send token in httpOnly cookie
//     res.cookie('token', token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'none',
//       secure: true,
//       maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
//     });

//     res.status(201).json({ 
//       message: 'User registered successfully',
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         createdAt: user.createdAt
//       }

//     });

//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Find user
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(401).json({ message: 'Email not found!' });
//     }

//     // Check password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: 'Invalid Password!' });
//     }

//     // Generate JWT
//     const token = jwt.sign(
//       { userId: user._id }, 
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRE }
//     );

//     // Send token in httpOnly cookie
//     res.cookie('token', token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
//     });

//     res.json({
//       message: 'Login successful',
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         createdAt: user.createdAt
//       }
//     });

//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// const logout = async(req, res) => {
//   try{
//     res.clearCookie('token', {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === 'production',
//     sameSite: 'strict'
//   });
  
//   res.json({ message: 'Logged out successfully' });
//   }
//   catch(err){
//     console.log("Error while logging out!",err)
//   }
// };

// const updateProfile = async(req, res) => {
//   try{
//     const { name, email, currentPassword, newPassword } = req.body;

//     const user = await User.findById(req.userId);
//     if(!user) {
//       return res.status(404).json({message: 'User not found!'})
//     }

//     if(newPassword){
//       if(!currentPassword) {
//         return res.status(400).json({message: "Current password required!"});
//       }

//       const isMatch = await user.comparePassword(currentPassword);
//       if(!isMatch){
//         return res.status(401).json({ message: "Current password is incorrect!"})
//       }
//       user.password = newPassword;
//     }

//     if (name) user.name = name;
//     if (email) user.email = email;

//     await user.save();

//     res.json({
//       message: 'Profile updated successfully',
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email
//       }
//     });
//   }
//   catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// }

// const deleteAccount = async (req, res) => {
//   try{
//     const { password } = req.body;

//     const user = await User.findById(req.userId);
//     if(!user){
//       return res.status(404).json({ message: 'User not found' });
//     };

//     const isMatch = await user.comparePassword(password);
//     if (!isMatch) {
//       return res.status(401).json({ message: 'Incorrect password' });
//     };

//     await User.findByIdAndDelete(req.userId);

//     res.clearCookie('token', {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict'
//     });

//     res.json({ message: 'Account deleted successfully' });

//   } catch(err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   };
// }

// const googleLogin = async (req, res) => {
//   try{
//     const { token } = req.body;

//     const ticket = await client.verifyIdToken({
//       idToken: token,
//       audience: process.env.GOOGLE_CLIENT_ID
//     })

//     const { name, email, sub, googleId } = ticket.getPayload();

//     let user = await User.findOne({ email });

//     if (user && !user.googleId) {
//       user.googleId = googleId;
//       await user.save();
//     }

//     if (!user) {
//       user = new User({ 
//         name, 
//         email, 
//         googleId // won't be used but field is required
//       });
//       await user.save();
//     }

//     const jwtToken = jwt.sign(
//       { userId: user._id },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRE }
//     );

//     res.cookie('token', jwtToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       maxAge: 30 * 24 * 60 * 60 * 1000
//     });
    
//     res.json({
//       message: 'Google login successful',
//       user: { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt }
//     });
//   }
//   catch(error){
//     res.status(401).json({ message: 'Google authentication failed', error: error.message });
//   }
// }

// module.exports = { register, login, logout, updateProfile, deleteAccount, googleLogin };

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Consistent cookie config for cross-origin (mobile) support
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
};

// Register new user
const register = async (req, res) => {
  console.log('📥 Register request received:', req.body);

  try {
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({ name, email, password });
    await user.save();

    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.cookie('token', token, cookieOptions);

    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email not found!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid Password!' });
    }

    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.cookie('token', token, cookieOptions);

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const logout = async(req, res) => {
  try{
    res.clearCookie('token', cookieOptions);
    res.json({ message: 'Logged out successfully' });
  }
  catch(err){
    console.log("Error while logging out!", err)
  }
};

const updateProfile = async(req, res) => {
  try{
    const { name, email, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);
    if(!user) {
      return res.status(404).json({message: 'User not found!'})
    }

    if(newPassword){
      if(!currentPassword) {
        return res.status(400).json({message: "Current password required!"});
      }

      const isMatch = await user.comparePassword(currentPassword);
      if(!isMatch){
        return res.status(401).json({ message: "Current password is incorrect!"})
      }
      user.password = newPassword;
    }

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  }
  catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

const deleteAccount = async (req, res) => {
  try{
    const { password } = req.body;

    const user = await User.findById(req.userId);
    if(!user){
      return res.status(404).json({ message: 'User not found' });
    };

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    };

    await User.findByIdAndDelete(req.userId);

    res.clearCookie('token', cookieOptions);

    res.json({ message: 'Account deleted successfully' });

  } catch(err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  };
}

const googleLogin = async (req, res) => {
  try{
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    })

    const { name, email, sub, googleId } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (user && !user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    if (!user) {
      user = new User({ 
        name, 
        email, 
        googleId
      });
      await user.save();
    }

    const jwtToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.cookie('token', jwtToken, cookieOptions);
    
    res.json({
      message: 'Google login successful',
      user: { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt }
    });
  }
  catch(error){
    res.status(401).json({ message: 'Google authentication failed', error: error.message });
  }
}

module.exports = { register, login, logout, updateProfile, deleteAccount, googleLogin };